import fs from "fs";
import { Jimp } from "jimp";
import jsQR from "jsqr";
import { flattenAlpha } from "./flattenAlpha";

const MAX_DIM = 1500;

export async function decodeImage(filePath: string): Promise<string> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Image file not found: ${filePath}`);
  }
  const buffer = fs.readFileSync(filePath);
  const image = await Jimp.fromBuffer(buffer);
  if (image.bitmap.width > MAX_DIM || image.bitmap.height > MAX_DIM) {
    if (image.bitmap.width >= image.bitmap.height) {
      image.resize({ w: MAX_DIM });
    } else {
      image.resize({ h: MAX_DIM });
    }
  }
  const { data, width, height } = image.bitmap;
  flattenAlpha(data);
  const code = jsQR(new Uint8ClampedArray(data), width, height, { inversionAttempts: "attemptBoth" });
  if (!code) {
    throw new Error(`No QR code detected in ${width}x${height} image`);
  }
  return code.data;
}
