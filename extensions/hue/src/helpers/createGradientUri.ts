import { Jimp, JimpMime, rgbaToInt } from "jimp";
import chroma from "chroma-js";

export async function createGradientPngUri(colors: string[], width: number, height: number): Promise<string> {
  const image = new Jimp({ width, height });

  const scale = chroma.scale(colors).gamma(0.8).padding(0.15);

  image.scan(0, 0, width, height, (x, y) => {
    const factor = (y / height) * 2.3;
    const rgba = scale(x / width)
      .darken(factor * (factor * 0.5))
      .rgba(true);

    image.setPixelColor(rgbaToInt(rgba[0], rgba[1], rgba[2], 254 * rgba[3]), x, y);
  });

  return await image.getBase64(JimpMime.png);
}
