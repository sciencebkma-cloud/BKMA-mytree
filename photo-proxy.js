// Netlify Function: photo-proxy
// ทำหน้าที่เป็นตัวกลางดึงรูปจาก JotForm แทนเบราว์เซอร์ของผู้ใช้ โดยใช้ JOTFORM_API_KEY
// ที่เก็บไว้เป็น Environment Variable บน Netlify (ไม่โผล่ในโค้ดฝั่งเว็บ/หน้าเว็บเลย)
//
// วิธีตั้งค่า API key (ทำครั้งเดียว):
//   Netlify → เข้าไซต์ของคุณ → Site configuration → Environment variables
//   → Add a variable → Key: JOTFORM_API_KEY, Value: (API key จาก https://www.jotform.com/myaccount/api/)
//   → Save แล้ว "Trigger deploy" ใหม่อีกครั้งให้ค่าตัวแปรมีผล

exports.handler = async function (event) {
  const url = event.queryStringParameters && event.queryStringParameters.url;

  // จำกัดให้ proxy นี้เรียกได้เฉพาะไฟล์จากโดเมน jotform เท่านั้น กันคนเอาไปใช้เป็น proxy ทั่วไป
  if (!url || !/^https:\/\/(www\.)?jotform\.com\/uploads\//.test(url)) {
    return { statusCode: 400, body: "invalid url" };
  }

  const apiKey = process.env.JOTFORM_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: "JOTFORM_API_KEY not configured on this Netlify site" };
  }

  try {
    const upstream = await fetch(`${url}?apiKey=${apiKey}`);
    if (!upstream.ok) {
      return { statusCode: upstream.status, body: "upstream error " + upstream.status };
    }
    const contentType = upstream.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await upstream.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    return {
      statusCode: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600"
      },
      body: base64,
      isBase64Encoded: true
    };
  } catch (err) {
    return { statusCode: 500, body: "proxy error: " + err.message };
  }
};
