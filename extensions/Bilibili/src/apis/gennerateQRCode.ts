import { API } from "./api";

import got from "got";
import QRCode from "qrcode";

export async function gennerateQRCode() {
  const res: Bilibili.GennerateQRCodeResponse = await got(API.gennerateQRCode()).json();

  if (res.code !== 0) throw new Error(res.message);

  const { url, qrcode_key } = res.data;
  const qrcode = await QRCode.toDataURL(url);

  return { qrcode, qrcode_key };
}
