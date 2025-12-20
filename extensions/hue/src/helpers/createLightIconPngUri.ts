import { Jimp, JimpMime, rgbaToInt, BlendMode } from "jimp";
import chroma from "chroma-js";
import { PngUri } from "../lib/types";
import { environment } from "@raycast/api";

const LUMINANCE_THRESHOLD = 0.7;

export async function createLightOnIconPngUri(
  iconPath: string,
  colorHex: string,
  width: number,
  height: number,
): Promise<PngUri> {
  const image = new Jimp({ width, height });

  const color = chroma(colorHex);
  image.scan(0, 0, width, height, (x, y) => {
    const factor = (y / height) * 2.3;
    const rgba = color.darken(factor * (factor * 0.5)).rgba(true);

    image.setPixelColor(rgbaToInt(rgba[0], rgba[1], rgba[2], 254 * rgba[3]), x, y);
  });

  const overlayImage = await Jimp.read(iconPath);
  overlayImage.brightness(color.luminance() < LUMINANCE_THRESHOLD ? 0 : -0.9);
  image.composite(overlayImage, 24, 24, {
    mode: BlendMode.SRC_OVER,
    opacitySource: 1,
    opacityDest: 1,
  });

  return await image.getBase64(JimpMime.png);
}

export async function createLightOffIconPngUri(
  iconPath: string,
  theme: "light" | "dark",
  width: number,
  height: number,
): Promise<PngUri> {
  const image = new Jimp({ width, height });

  const lightOffImage = await Jimp.read(environment.assetsPath + `/light-off${theme === "dark" ? "@dark" : ""}.png`);
  image.composite(lightOffImage, 0, 0);

  const overlayImage = await Jimp.read(iconPath);
  overlayImage.brightness(theme === "dark" ? 0 : -0.9);
  image.composite(overlayImage, 24, 24, {
    mode: BlendMode.SRC_OVER,
    opacitySource: 1,
    opacityDest: 1,
  });

  return await image.getBase64(JimpMime.png);
}
