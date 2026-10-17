import fs from "fs";
import path from "path";
import { environment } from "@raycast/api";
import { Jimp, intToRGBA, rgbaToInt } from "jimp";
import { saturate, getPatternValue, luminance, applyBlur, grainNoise, hueShift } from "./common";

// Helper function to extract mono channel value
function getMonoChannelValue(monoMode: string, r: number, g: number, b: number): number {
  switch (monoMode) {
    case "mono-r":
      return r;
    case "mono-g":
      return g;
    case "mono-b":
      return b;
    case "mono-y": // Yellow = R + G
      return (r + g) / 2;
    case "mono-c": // Cyan = G + B
      return (g + b) / 2;
    case "mono-m": // Magenta = R + B
      return (r + b) / 2;
    case "grayscale":
    default:
      return luminance(r, g, b);
  }
}

// Helper function to convert mono channel value to RGB output
function monoChannelToRgb(monoMode: string, monoValue: number): { r: number; g: number; b: number } {
  switch (monoMode) {
    case "mono-r":
      return { r: monoValue, g: 0, b: 0 };
    case "mono-g":
      return { r: 0, g: monoValue, b: 0 };
    case "mono-b":
      // Cyan blue color #1447E6 (R=20, G=71, B=230)
      return {
        r: monoValue * (20 / 255),
        g: monoValue * (71 / 255),
        b: monoValue * (230 / 255),
      };
    case "mono-y":
      return { r: monoValue, g: monoValue, b: 0 };
    case "mono-c":
      return { r: 0, g: monoValue, b: monoValue };
    case "mono-m":
      return { r: monoValue, g: 0, b: monoValue };
    case "grayscale":
    default:
      return { r: monoValue, g: monoValue, b: monoValue };
  }
}

export interface DitherParams {
  pattern: number; // 0=F-S, 1=Bayer, 2=Random
  pixelSize: number;
  threshold: number;
  colorMode: boolean;
  monoMode?: "grayscale" | "mono-r" | "mono-g" | "mono-b" | "mono-y" | "mono-c" | "mono-m";
  whiteEffect?: boolean;
  hue?: number;
  showEffect: boolean;
  ditherAmount: number; // 0-100, controls dithering intensity
  blur: number;
  grain: number;
  gamma: number;
  blackPoint: number;
  whitePoint: number;
}

/**
 * Processes an image using the dither algorithm
 */
export async function processImageWithDither(
  inputImagePath: string,
  params: DitherParams,
  outputPath?: string,
): Promise<string> {
  const image = await Jimp.read(inputImagePath);
  const width = image.width;
  const height = image.height;

  if (params.blur > 0) {
    await applyBlur(image, params.blur, intToRGBA, rgbaToInt);
  }

  const pixelSize = Math.max(1, Math.floor(params.pixelSize) | 1);

  const readPreprocessed = (img: typeof image, bx: number, by: number) => {
    const rgba = intToRGBA(img.getPixelColor(bx, by));
    let r = rgba.r / 255.0;
    let g = rgba.g / 255.0;
    let b = rgba.b / 255.0;

    r = Math.pow(r, 1.0 / params.gamma);
    g = Math.pow(g, 1.0 / params.gamma);
    b = Math.pow(b, 1.0 / params.gamma);

    const range = params.whitePoint - params.blackPoint;
    if (range > 0) {
      r = saturate((r * 255.0 - params.blackPoint) / range);
      g = saturate((g * 255.0 - params.blackPoint) / range);
      b = saturate((b * 255.0 - params.blackPoint) / range);
    }

    return { r, g, b };
  };

  const applyGrain = (r: number, g: number, b: number, px: number, py: number) => {
    if (params.grain > 0) {
      const grainR = (grainNoise(px, py, 0) - 0.5) * params.grain;
      const grainG = (grainNoise(px, py, 1) - 0.5) * params.grain;
      const grainB = (grainNoise(px, py, 2) - 0.5) * params.grain;
      r = saturate(r + grainR);
      g = saturate(g + grainG);
      b = saturate(b + grainB);
    }
    return { r, g, b };
  };

  const baseT = saturate(params.threshold / 255.0);

  if (params.showEffect && params.pattern === 0) {
    if (params.colorMode) {
      const errR: number[] = new Array(width + 2).fill(0);
      const errG: number[] = new Array(width + 2).fill(0);
      const errB: number[] = new Array(width + 2).fill(0);
      const nextErrR: number[] = new Array(width + 2).fill(0);
      const nextErrG: number[] = new Array(width + 2).fill(0);
      const nextErrB: number[] = new Array(width + 2).fill(0);

      for (let y = 0; y < height; y++) {
        nextErrR.fill(0);
        nextErrG.fill(0);
        nextErrB.fill(0);
        for (let x = 0; x < width; x++) {
          const blockX = Math.floor(x / pixelSize) * pixelSize;
          const blockY = Math.floor(y / pixelSize) * pixelSize;
          let { r: r0, g: g0, b: b0 } = readPreprocessed(image, blockX, blockY);

          ({ r: r0, g: g0, b: b0 } = applyGrain(r0, g0, b0, x, y));

          const r = saturate(r0 + errR[x]);
          const g = saturate(g0 + errG[x]);
          const b = saturate(b0 + errB[x]);

          const qr = r > baseT ? 1 : 0;
          const qg = g > baseT ? 1 : 0;
          const qb = b > baseT ? 1 : 0;

          const er = r - qr;
          const eg = g - qg;
          const eb = b - qb;

          let finalR = qr;
          let finalG = qg;
          let finalB = qb;
          if (params.hue && params.hue !== 0) {
            [finalR, finalG, finalB] = hueShift(finalR, finalG, finalB, params.hue);
          }

          image.setPixelColor(rgbaToInt(finalR * 255, finalG * 255, finalB * 255, 255), x, y);

          const xp1 = x + 1;
          const xm1 = x - 1;
          errR[xp1] = (errR[xp1] || 0) + er * (7 / 16);
          errG[xp1] = (errG[xp1] || 0) + eg * (7 / 16);
          errB[xp1] = (errB[xp1] || 0) + eb * (7 / 16);

          if (xm1 >= 0) {
            nextErrR[xm1] += er * (3 / 16);
            nextErrG[xm1] += eg * (3 / 16);
            nextErrB[xm1] += eb * (3 / 16);
          }
          nextErrR[x] += er * (5 / 16);
          nextErrG[x] += eg * (5 / 16);
          nextErrB[x] += eb * (5 / 16);
          nextErrR[xp1] += er * (1 / 16);
          nextErrG[xp1] += eg * (1 / 16);
          nextErrB[xp1] += eb * (1 / 16);
        }
        for (let i = 0; i < width + 2; i++) {
          errR[i] = nextErrR[i];
          errG[i] = nextErrG[i];
          errB[i] = nextErrB[i];
        }
      }
    } else {
      const monoMode = params.monoMode || "grayscale";
      const err: number[] = new Array(width + 2).fill(0);
      const nextErr: number[] = new Array(width + 2).fill(0);

      for (let y = 0; y < height; y++) {
        nextErr.fill(0);
        for (let x = 0; x < width; x++) {
          const blockX = Math.floor(x / pixelSize) * pixelSize;
          const blockY = Math.floor(y / pixelSize) * pixelSize;
          let { r, g, b } = readPreprocessed(image, blockX, blockY);

          ({ r, g, b } = applyGrain(r, g, b, x, y));

          const monoValue = getMonoChannelValue(monoMode, r, g, b);
          const L = saturate(monoValue + err[x]);
          const bw = L > baseT ? 1 : 0;
          const e = L - bw;

          let finalR, finalG, finalB;
          if (params.whiteEffect) {
            if (bw === 1) {
              finalR = 1;
              finalG = 1;
              finalB = 1;
            } else {
              const rgb = monoChannelToRgb(monoMode, monoValue);
              finalR = rgb.r;
              finalG = rgb.g;
              finalB = rgb.b;
            }
          } else {
            const rgb = monoChannelToRgb(monoMode, bw);
            finalR = rgb.r;
            finalG = rgb.g;
            finalB = rgb.b;
          }
          image.setPixelColor(rgbaToInt(finalR * 255, finalG * 255, finalB * 255, 255), x, y);

          const xp1 = x + 1;
          const xm1 = x - 1;
          err[xp1] = (err[xp1] || 0) + e * (7 / 16);
          if (xm1 >= 0) nextErr[xm1] += e * (3 / 16);
          nextErr[x] += e * (5 / 16);
          nextErr[xp1] += e * (1 / 16);
        }
        for (let i = 0; i < width + 2; i++) err[i] = nextErr[i];
      }
    }
  } else {
    const threshold255 = params.threshold;

    image.scan(0, 0, width, height, function (this: typeof image, x: number, y: number) {
      const blockX = Math.floor(x / pixelSize) * pixelSize;
      const blockY = Math.floor(y / pixelSize) * pixelSize;
      let { r: r0, g: g0, b: b0 } = readPreprocessed(this, blockX, blockY);

      ({ r: r0, g: g0, b: b0 } = applyGrain(r0, g0, b0, x, y));

      let outR = r0;
      let outG = g0;
      let outB = b0;

      if (params.showEffect) {
        const bayerValue = getPatternValue(1, x, y);
        const ditherAmount = Math.max(0, Math.min(1, (params.ditherAmount || 100) / 100.0));
        const ditherOffset = (bayerValue * 17.0 - 127.0) * ditherAmount;

        if (params.colorMode) {
          const r255 = r0 * 255.0;
          const g255 = g0 * 255.0;
          const b255 = b0 * 255.0;

          const rDithered = r255 + ditherOffset;
          const gDithered = g255 + ditherOffset;
          const bDithered = b255 + ditherOffset;

          outR = rDithered >= threshold255 ? 1 : 0;
          outG = gDithered >= threshold255 ? 1 : 0;
          outB = bDithered >= threshold255 ? 1 : 0;
        } else {
          const monoMode = params.monoMode || "grayscale";
          const monoValue = getMonoChannelValue(monoMode, r0, g0, b0);
          const L255 = monoValue * 255.0;
          const LDithered = L255 + ditherOffset;
          const bw = LDithered >= threshold255 ? 1 : 0;

          if (params.whiteEffect) {
            if (bw === 1) {
              outR = 1;
              outG = 1;
              outB = 1;
            } else {
              const rgb = monoChannelToRgb(monoMode, monoValue);
              outR = rgb.r;
              outG = rgb.g;
              outB = rgb.b;
            }
          } else {
            const rgb = monoChannelToRgb(monoMode, bw);
            outR = rgb.r;
            outG = rgb.g;
            outB = rgb.b;
          }
        }
      }

      // Apply hue shift if needed (only in color mode)
      if (params.colorMode && params.hue && params.hue !== 0) {
        const [finalR, finalG, finalB] = hueShift(saturate(outR), saturate(outG), saturate(outB), params.hue);
        outR = finalR;
        outG = finalG;
        outB = finalB;
      }

      this.setPixelColor(rgbaToInt(Math.round(outR * 255), Math.round(outG * 255), Math.round(outB * 255), 255), x, y);
    });
  }

  const finalOutputPath = outputPath || path.join(environment.supportPath, `dither-output-${Date.now()}.png`);

  const supportDir = path.dirname(finalOutputPath);
  if (!fs.existsSync(supportDir)) {
    fs.mkdirSync(supportDir, { recursive: true });
  }

  await image.write(finalOutputPath as `${string}.${string}`);

  return finalOutputPath;
}
