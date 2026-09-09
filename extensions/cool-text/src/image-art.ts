import { Jimp, intToRGBA } from "jimp";

export const IMAGE_WIDTHS = { Compact: 32, Detailed: 56 } as const;
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_ROWS = 64;
const CHARACTER_ASPECT_RATIO = 0.5;
const CHANNEL_MAX = 255;
const LUMINANCE = { red: 0.2126, green: 0.7152, blue: 0.0722 };
const DENSITY_RAMP = "@%#*+=-:. ";
const BRAILLE_BASE = 0x2800;
const DOT_WIDTH = 2;
const DOT_HEIGHT = 4;
const DOT_BITS = [
  [1, 8],
  [2, 16],
  [4, 32],
  [64, 128],
];
const DITHER_THRESHOLD = 0.5;
const DIFFUSION = [
  { x: 1, y: 0, weight: 7 / 16 },
  { x: -1, y: 1, weight: 3 / 16 },
  { x: 0, y: 1, weight: 5 / 16 },
  { x: 1, y: 1, weight: 1 / 16 },
];

async function prepare(buffer: Buffer, columns: number, cellWidth: number, cellHeight: number) {
  if (buffer.length > MAX_IMAGE_BYTES) throw new Error("Choose an image smaller than 20 MB.");
  if (!Number.isInteger(columns) || columns < 1 || columns > IMAGE_WIDTHS.Detailed) {
    throw new Error("Choose a supported image width.");
  }
  const image = await Jimp.fromBuffer(buffer);
  const aspectRatio = image.height / image.width;
  const width = Math.max(1, Math.min(columns, Math.floor(MAX_ROWS / (aspectRatio * CHARACTER_ASPECT_RATIO))));
  const height = Math.min(MAX_ROWS, Math.max(1, Math.round(width * aspectRatio * CHARACTER_ASPECT_RATIO)));
  image.resize({ w: width * cellWidth, h: height * cellHeight });
  return { image, width, height };
}

function brightness(pixel: number, invert: boolean) {
  const { r, g, b, a } = intToRGBA(pixel);
  const alpha = a / CHANNEL_MAX;
  const value = ((r * LUMINANCE.red + g * LUMINANCE.green + b * LUMINANCE.blue) / CHANNEL_MAX) * alpha + 1 - alpha;
  return invert ? 1 - value : value;
}

export async function imageToAscii(buffer: Buffer, columns: number = IMAGE_WIDTHS.Compact, invert = false) {
  const { image, width, height } = await prepare(buffer, columns, 1, 1);
  return Array.from({ length: height }, (_, y) =>
    Array.from(
      { length: width },
      (_, x) => DENSITY_RAMP[Math.round(brightness(image.getPixelColor(x, y), invert) * (DENSITY_RAMP.length - 1))],
    )
      .join("")
      .trimEnd(),
  ).join("\n");
}

export async function imageToDots(buffer: Buffer, columns: number = IMAGE_WIDTHS.Compact, invert = false) {
  const { image, width, height } = await prepare(buffer, columns, DOT_WIDTH, DOT_HEIGHT);
  const pixels = Float64Array.from({ length: image.width * image.height }, (_, index) =>
    brightness(image.getPixelColor(index % image.width, Math.floor(index / image.width)), invert),
  );
  const ink = new Uint8Array(pixels.length);
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const index = y * image.width + x;
      const quantized = pixels[index] < DITHER_THRESHOLD ? 0 : 1;
      ink[index] = 1 - quantized;
      const error = pixels[index] - quantized;
      for (const offset of DIFFUSION) {
        const nextX = x + offset.x;
        const nextY = y + offset.y;
        if (nextX >= 0 && nextX < image.width && nextY < image.height) {
          pixels[nextY * image.width + nextX] += error * offset.weight;
        }
      }
    }
  }
  return Array.from({ length: height }, (_, row) =>
    Array.from({ length: width }, (_, column) => {
      let mask = 0;
      for (let y = 0; y < DOT_HEIGHT; y++) {
        for (let x = 0; x < DOT_WIDTH; x++) {
          if (ink[(row * DOT_HEIGHT + y) * image.width + column * DOT_WIDTH + x]) mask |= DOT_BITS[y][x];
        }
      }
      return String.fromCodePoint(BRAILLE_BASE + mask);
    }).join(""),
  ).join("\n");
}
