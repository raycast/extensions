import Jimp from "jimp";
import chroma from "chroma-js";
import { environment, Image } from "@raycast/api";

export function createIconSquare(colorHex: string, icon: Image, width: number, height: number): Promise<string> {
  return new Promise((resolve, reject) => {
    new Jimp(width, height, async (error, image) => {
      if (error) {
        return reject(error);
      }

      const color = chroma.hex(colorHex);
      image.scan(0, 0, width, height, (x, y) => {
        const factor = (y / height) * 2.3;
        const rgba = color.darken(factor * (factor * 0.5)).rgba(true);

        image.setPixelColor(Jimp.rgbaToInt(rgba[0], rgba[1], rgba[2], 254 * rgba[3]), x, y);
      });

      const overlayImage = await Jimp.read(`${environment.assetsPath}/${icon.source}`);
      image.composite(overlayImage, 24, 24, {
        mode: Jimp.BLEND_SOURCE_OVER,
        opacitySource: 1,
        opacityDest: 1,
      });

      image.getBase64(Jimp.MIME_PNG, (error, base64) => {
        if (error) {
          return reject(error);
        }
        return resolve(base64);
      });
    });
  });
}
