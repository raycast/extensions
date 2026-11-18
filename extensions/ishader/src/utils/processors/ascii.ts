import fs from "fs";
import path from "path";
import { environment } from "@raycast/api";
import { Jimp, intToRGBA, rgbaToInt } from "jimp";
import { saturate, luminance, applyBlur, grainNoise, hueShift } from "./common";

export interface AsciiParams {
  showEffect: boolean;
  blur: number;
  grain: number;
  gamma: number;
  blackPoint: number;
  whitePoint: number;
  charSize: number; // character size in pixels (4-32)
  characterSet: string; // characters to use for ASCII art
  colorMode: boolean;
  monoMode?: "grayscale" | "mono-r" | "mono-g" | "mono-b" | "mono-y" | "mono-c" | "mono-m";
  whiteEffect?: boolean;
  hue?: number;
}

/**
 * Simple bitmap font patterns for ASCII characters (5x7 grid)
 * Each character is represented as a 2D array where 1 = foreground pixel, 0 = background
 */
const ASCII_PATTERNS: { [key: string]: number[][] } = {
  " ": [
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
  ],
  ".": [
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
  ],
  ":": [
    [0, 0, 0, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 0, 0, 0],
  ],
  "-": [
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [1, 1, 1, 1, 1],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
  ],
  "=": [
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [1, 1, 1, 1, 1],
    [0, 0, 0, 0, 0],
    [1, 1, 1, 1, 1],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
  ],
  "+": [
    [0, 0, 0, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [1, 1, 1, 1, 1],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 0, 0, 0],
  ],
  "*": [
    [0, 0, 0, 0, 0],
    [0, 1, 0, 1, 0],
    [0, 0, 1, 0, 0],
    [1, 1, 1, 1, 1],
    [0, 0, 1, 0, 0],
    [0, 1, 0, 1, 0],
    [0, 0, 0, 0, 0],
  ],
  "#": [
    [0, 1, 0, 1, 0],
    [1, 1, 1, 1, 1],
    [0, 1, 0, 1, 0],
    [1, 1, 1, 1, 1],
    [0, 1, 0, 1, 0],
    [1, 1, 1, 1, 1],
    [0, 1, 0, 1, 0],
  ],
  "%": [
    [1, 1, 0, 0, 1],
    [1, 1, 0, 1, 0],
    [0, 0, 1, 0, 0],
    [0, 1, 0, 0, 0],
    [1, 0, 0, 1, 1],
    [0, 1, 0, 1, 1],
    [1, 0, 0, 1, 1],
  ],
  "@": [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 1, 1, 1],
    [1, 0, 1, 0, 1],
    [1, 0, 1, 1, 0],
    [1, 0, 0, 0, 0],
    [0, 1, 1, 1, 1],
  ],
};

/**
 * Get pattern for a character, or return space pattern if not found
 */
function getCharPattern(char: string): number[][] {
  return ASCII_PATTERNS[char] || ASCII_PATTERNS[" "];
}

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

/**
 * Processes an image using ASCII art algorithm
 */
export async function processImageWithAscii(
  inputImagePath: string,
  params: AsciiParams,
  outputPath?: string,
): Promise<string> {
  const image = await Jimp.read(inputImagePath);
  const width = image.width;
  const height = image.height;

  if (params.blur > 0) {
    await applyBlur(image, params.blur, intToRGBA, rgbaToInt);
  }

  const charSet = params.characterSet || " .:-=+*#%@";
  if (charSet.length === 0) {
    throw new Error("Character set cannot be empty");
  }

  const charSize = Math.max(4, Math.min(32, Math.floor(params.charSize)));

  const patternWidth = 5;
  const patternHeight = 7;

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

  const cellLumCache = new Map<string, number>();
  const cellColorCache = new Map<string, { r: number; g: number; b: number }>();
  const cols = Math.floor(width / charSize);
  const rows = Math.floor(height / charSize);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cellStartX = col * charSize;
      const cellStartY = row * charSize;
      const cellEndX = Math.min(width - 1, (col + 1) * charSize - 1);
      const cellEndY = Math.min(height - 1, (row + 1) * charSize - 1);

      let totalLum = 0;
      let totalR = 0;
      let totalG = 0;
      let totalB = 0;
      let pixelCount = 0;

      for (let y = cellStartY; y <= cellEndY; y++) {
        for (let x = cellStartX; x <= cellEndX; x++) {
          let { r, g, b } = readPreprocessed(image, x, y);
          ({ r, g, b } = applyGrain(r, g, b, x, y));
          const lum = luminance(r * 255, g * 255, b * 255) / 255.0;
          totalLum += lum;
          totalR += r;
          totalG += g;
          totalB += b;
          pixelCount++;
        }
      }

      const avgLum = pixelCount > 0 ? totalLum / pixelCount : 0;
      const avgR = pixelCount > 0 ? totalR / pixelCount : 0;
      const avgG = pixelCount > 0 ? totalG / pixelCount : 0;
      const avgB = pixelCount > 0 ? totalB / pixelCount : 0;

      cellLumCache.set(`${col},${row}`, avgLum);
      cellColorCache.set(`${col},${row}`, { r: avgR, g: avgG, b: avgB });
    }
  }

  image.scan(0, 0, width, height, function (this: typeof image, x: number, y: number) {
    const cellX = Math.floor(x / charSize) * charSize;
    const cellY = Math.floor(y / charSize) * charSize;
    const cellCol = Math.floor(x / charSize);
    const cellRow = Math.floor(y / charSize);
    const cellKey = `${cellCol},${cellRow}`;

    let { r: r0, g: g0, b: b0 } = readPreprocessed(this, x, y);

    ({ r: r0, g: g0, b: b0 } = applyGrain(r0, g0, b0, x, y));

    let outR = r0;
    let outG = g0;
    let outB = b0;

    if (params.showEffect) {
      const avgLum = cellLumCache.get(cellKey) || 0;
      const avgColor = cellColorCache.get(cellKey) || { r: 0, g: 0, b: 0 };

      let brightnessForChar = avgLum;

      if (params.colorMode) {
        brightnessForChar = avgLum;
      } else {
        const monoMode = params.monoMode || "grayscale";
        brightnessForChar = getMonoChannelValue(monoMode, avgColor.r, avgColor.g, avgColor.b);
      }

      const charIndex = Math.floor((1.0 - brightnessForChar) * (charSet.length - 1));
      const char = charSet[charIndex] || charSet[0];

      const pattern = getCharPattern(char);

      const localX = x - cellX;
      const localY = y - cellY;

      const cellEndX = Math.min(width - 1, (cellCol + 1) * charSize - 1);
      const cellEndY = Math.min(height - 1, (cellRow + 1) * charSize - 1);
      const cellW = cellEndX - cellX + 1;
      const cellH = cellEndY - cellY + 1;

      const patternScaleX = cellW / patternWidth;
      const patternScaleY = cellH / patternHeight;
      const patternX = Math.floor(localX / patternScaleX);
      const patternY = Math.floor(localY / patternScaleY);

      if (patternY >= 0 && patternY < patternHeight && patternX >= 0 && patternX < patternWidth) {
        const shouldDraw = pattern[patternY] && pattern[patternY][patternX];

        if (shouldDraw) {
          if (params.colorMode) {
            outR = 1.0 - avgColor.r;
            outG = 1.0 - avgColor.g;
            outB = 1.0 - avgColor.b;
          } else {
            const monoMode = params.monoMode || "grayscale";
            if (params.whiteEffect) {
              outR = 1;
              outG = 1;
              outB = 1;
            } else {
              const monoValue = getMonoChannelValue(monoMode, avgColor.r, avgColor.g, avgColor.b);
              const charBrightness = 1.0 - monoValue;
              const rgb = monoChannelToRgb(monoMode, charBrightness);
              outR = rgb.r;
              outG = rgb.g;
              outB = rgb.b;
            }
          }
        } else {
          if (params.colorMode) {
            outR = avgColor.r;
            outG = avgColor.g;
            outB = avgColor.b;
          } else {
            const monoMode = params.monoMode || "grayscale";
            const monoValue = getMonoChannelValue(monoMode, avgColor.r, avgColor.g, avgColor.b);
            const rgb = monoChannelToRgb(monoMode, monoValue);
            outR = rgb.r;
            outG = rgb.g;
            outB = rgb.b;
          }
        }
      } else {
        if (params.colorMode) {
          outR = avgColor.r;
          outG = avgColor.g;
          outB = avgColor.b;
        } else {
          const monoMode = params.monoMode || "grayscale";
          const monoValue = getMonoChannelValue(monoMode, avgColor.r, avgColor.g, avgColor.b);
          const rgb = monoChannelToRgb(monoMode, monoValue);
          outR = rgb.r;
          outG = rgb.g;
          outB = rgb.b;
        }
      }
    }

    if (params.colorMode && params.hue && params.hue !== 0) {
      const [finalR, finalG, finalB] = hueShift(saturate(outR), saturate(outG), saturate(outB), params.hue);
      outR = finalR;
      outG = finalG;
      outB = finalB;
    }

    this.setPixelColor(rgbaToInt(Math.round(outR * 255), Math.round(outG * 255), Math.round(outB * 255), 255), x, y);
  });

  const finalOutputPath = outputPath || path.join(environment.supportPath, `ascii-output-${Date.now()}.png`);

  const supportDir = path.dirname(finalOutputPath);
  if (!fs.existsSync(supportDir)) {
    fs.mkdirSync(supportDir, { recursive: true });
  }

  await image.write(finalOutputPath as `${string}.${string}`);

  return finalOutputPath;
}
