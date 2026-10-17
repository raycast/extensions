import fs from "fs";
import path from "path";
import { environment } from "@raycast/api";
import { Jimp, intToRGBA, rgbaToInt } from "jimp";
import { saturate, applyBlur, grainNoise } from "./common";

export interface EditParams {
  showEffect: boolean;
  blur: number;
  grain: number;
  gamma: number;
  blackPoint: number;
  whitePoint: number;
}

/**
 * Processes an image using only common preprocessing parameters
 * Applies blur, grain, gamma, and black/white point adjustments
 */
export async function processImageWithEdit(
  inputImagePath: string,
  params: EditParams,
  outputPath?: string,
): Promise<string> {
  const image = await Jimp.read(inputImagePath);
  const width = image.width;
  const height = image.height;

  if (params.showEffect && params.blur > 0) {
    await applyBlur(image, params.blur, intToRGBA, rgbaToInt);
  }

  image.scan(0, 0, width, height, function (this: typeof image, x: number, y: number) {
    const rgba = intToRGBA(this.getPixelColor(x, y));

    if (!params.showEffect) {
      return;
    }

    let r = rgba.r / 255.0;
    let g = rgba.g / 255.0;
    let b = rgba.b / 255.0;

    const gamma = Math.max(0.001, params.gamma);
    r = Math.pow(Math.max(0, r), 1.0 / gamma);
    g = Math.pow(Math.max(0, g), 1.0 / gamma);
    b = Math.pow(Math.max(0, b), 1.0 / gamma);

    const range = Math.max(1.0, params.whitePoint - params.blackPoint);
    r = saturate((r * 255.0 - params.blackPoint) / range);
    g = saturate((g * 255.0 - params.blackPoint) / range);
    b = saturate((b * 255.0 - params.blackPoint) / range);

    if (params.grain > 0) {
      const grainR = (grainNoise(x, y, 0) - 0.5) * params.grain;
      const grainG = (grainNoise(x, y, 1) - 0.5) * params.grain;
      const grainB = (grainNoise(x, y, 2) - 0.5) * params.grain;
      r = saturate(r + grainR);
      g = saturate(g + grainG);
      b = saturate(b + grainB);
    }

    this.setPixelColor(rgbaToInt(Math.round(r * 255), Math.round(g * 255), Math.round(b * 255), rgba.a), x, y);
  });

  const finalOutputPath = outputPath || path.join(environment.supportPath, `edit-output-${Date.now()}.png`);

  const supportDir = path.dirname(finalOutputPath);
  if (!fs.existsSync(supportDir)) {
    fs.mkdirSync(supportDir, { recursive: true });
  }

  await image.write(finalOutputPath as `${string}.${string}`);

  return finalOutputPath;
}
