import Jimp from "jimp";
import chroma from "chroma-js";

export function createGradientPngUri(colors: string[], width: number, height: number): Promise<string> {
  return new Promise((resolve, reject) => {
    new Jimp(width, height, (err, image) => {
      if (err) reject(err);

      const scale = chroma.scale(colors).gamma(0.5);

      image.scan(0, 0, width, height, (x, y) => {
        const factor = (y / height) * 2.3;
        const rgba = scale(x / width)
          .darken(factor * (factor * 0.5))
          .rgba(true);

        image.setPixelColor(Jimp.rgbaToInt(rgba[0], rgba[1], rgba[2], 254 * rgba[3]), x, y);
      });

      image.getBase64(Jimp.MIME_PNG, (err, base64) => {
        if (err) reject(err);
        resolve(base64);
      });
    });
  });
}
