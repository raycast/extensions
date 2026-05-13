import { Jimp } from "jimp";
import jsQR from "jsqr";
import fs from "fs";

export async function decodeImage(filePath: string): Promise<string> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Image file not found: ${filePath}`);
  }
  const buffer = fs.readFileSync(filePath);
  const image = await Jimp.fromBuffer(buffer);
  const { data, width, height } = image.bitmap;
  const code = jsQR(new Uint8ClampedArray(data), width, height);
  if (!code) {
    throw new Error("No QR code detected in the image");
  }
  return code.data;
}
