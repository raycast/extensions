import { API } from "./api";

import got from "got";

export async function checkQRCode(qrcodeKey: string) {
  const res = await got(`${API.checkQRCodeStatus()}?qrcode_key=${qrcodeKey}`);

  return { res: JSON.parse(res.body), cookie: res.headers["set-cookie"] };
}
