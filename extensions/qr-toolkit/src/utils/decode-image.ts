import Jimp from "jimp";
import jsQR from "jsqr";

export async function decodeQR(filePath: string): Promise<string | null> {
  const image = await Jimp.read(filePath);
  const { data, width, height } = image.bitmap;
  const result = jsQR(new Uint8ClampedArray(data.buffer), width, height);
  return result?.data ?? null;
}
