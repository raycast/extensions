import { readFile } from "node:fs/promises";
import { PNG } from "pngjs";

export type GrayImage = {
  width: number;
  height: number;
  data: Float32Array;
};

export type SquareModelInput = {
  data: Float32Array;
  dimensions: [number, number, number, number];
};

const MAX_WIDTH = 672;
const MAX_HEIGHT = 192;
const MIN_WIDTH = 32;
const MIN_HEIGHT = 32;

export class BlankCaptureError extends Error {
  constructor() {
    super("The selected region does not contain a visible equation.");
  }
}

export async function loadPng(path: string): Promise<GrayImage> {
  const png = PNG.sync.read(await readFile(path));
  const pixels = new Float32Array(png.width * png.height);
  let min = 255;
  let max = 0;

  for (let index = 0; index < pixels.length; index += 1) {
    const offset = index * 4;
    const alpha = png.data[offset + 3] / 255;
    const red = png.data[offset] * alpha + 255 * (1 - alpha);
    const green = png.data[offset + 1] * alpha + 255 * (1 - alpha);
    const blue = png.data[offset + 2] * alpha + 255 * (1 - alpha);
    const value = 0.299 * red + 0.587 * green + 0.114 * blue;
    pixels[index] = value;
    min = Math.min(min, value);
    max = Math.max(max, value);
  }

  if (max - min < 1) throw new BlankCaptureError();
  return { width: png.width, height: png.height, data: pixels };
}

export function cropAndPad(source: GrayImage, divisible = 32): GrayImage {
  let minimum = Number.POSITIVE_INFINITY;
  let maximum = Number.NEGATIVE_INFINITY;
  for (const value of source.data) {
    minimum = Math.min(minimum, value);
    maximum = Math.max(maximum, value);
  }
  if (maximum - minimum < 1) throw new BlankCaptureError();
  const normalized = new Float32Array(source.data.length);
  for (let index = 0; index < source.data.length; index += 1) {
    normalized[index] = ((source.data[index] - minimum) / (maximum - minimum)) * 255;
  }

  let mean = 0;
  for (const value of normalized) mean += value;
  mean /= normalized.length;
  const foregroundIsDark = mean > 128;

  let left = source.width;
  let top = source.height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const value = normalized[y * source.width + x];
      const foreground = foregroundIsDark ? value < 128 : value > 128;
      if (foreground) {
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }
  }
  if (right < left || bottom < top) throw new BlankCaptureError();

  const cropWidth = right - left + 1;
  const cropHeight = bottom - top + 1;
  const width = Math.ceil(cropWidth / divisible) * divisible;
  const height = Math.ceil(cropHeight / divisible) * divisible;
  const data = new Float32Array(width * height);
  data.fill(255);
  for (let y = 0; y < cropHeight; y += 1) {
    for (let x = 0; x < cropWidth; x += 1) {
      let value = normalized[(top + y) * source.width + left + x];
      if (!foregroundIsDark) value = 255 - value;
      data[y * width + x] = value;
    }
  }
  return { width, height, data };
}

export function constrainSize(source: GrayImage): GrayImage {
  const scale = Math.max(source.width / MAX_WIDTH, source.height / MAX_HEIGHT, 1);
  let image = source;
  if (scale > 1) {
    image = resize(
      source,
      Math.max(1, Math.floor(source.width / scale)),
      Math.max(1, Math.floor(source.height / scale)),
      "bilinear",
    );
  }
  const width = Math.max(image.width, MIN_WIDTH);
  const height = Math.max(image.height, MIN_HEIGHT);
  if (width === image.width && height === image.height) return image;
  const data = new Float32Array(width * height);
  data.fill(255);
  for (let y = 0; y < image.height; y += 1) {
    data.set(image.data.subarray(y * image.width, (y + 1) * image.width), y * width);
  }
  return { width, height, data };
}

export function prepareInitialImage(source: GrayImage): GrayImage {
  return constrainSize(cropAndPad(source));
}

/** Prepare the fixed 448x448 grayscale tensor expected by TexTeller3. */
export function prepareTexTellerInput(source: GrayImage): SquareModelInput {
  const cropped = prepareInitialImage(source);
  const size = 448;
  const scale = Math.min(size / cropped.width, size / cropped.height);
  const resizedWidth = Math.max(1, Math.min(size, Math.round(cropped.width * scale)));
  const resizedHeight = Math.max(1, Math.min(size, Math.round(cropped.height * scale)));
  // Hugging Face's ViTFeatureExtractor uses PIL resample=3 (bicubic).
  // Matching it also avoids the extra 6x6 Lanczos taps on every output pixel.
  const resized = resize(cropped, resizedWidth, resizedHeight, "bicubic");
  const pixels = new Float32Array(size * size).fill(255);
  const left = Math.floor((size - resized.width) / 2);
  const top = Math.floor((size - resized.height) / 2);
  for (let y = 0; y < resized.height; y += 1) {
    pixels.set(
      resized.data.subarray(y * resized.width, (y + 1) * resized.width),
      (top + y) * size + left,
    );
  }

  const mean = 0.9545467;
  const standardDeviation = 0.15394445;
  for (let index = 0; index < pixels.length; index += 1) {
    pixels[index] = (pixels[index] / 255 - mean) / standardDeviation;
  }
  return { data: pixels, dimensions: [1, 1, size, size] };
}

function resize(
  source: GrayImage,
  width: number,
  height: number,
  method: "bilinear" | "bicubic",
): GrayImage {
  if (width === source.width && height === source.height) return source;
  const data = new Float32Array(width * height);
  const sample = method === "bilinear" ? bilinearSample : bicubicSample;
  for (let y = 0; y < height; y += 1) {
    const sourceY = ((y + 0.5) * source.height) / height - 0.5;
    for (let x = 0; x < width; x += 1) {
      const sourceX = ((x + 0.5) * source.width) / width - 0.5;
      data[y * width + x] = sample(source, sourceX, sourceY);
    }
  }
  return { width, height, data };
}

function pixel(image: GrayImage, x: number, y: number): number {
  const px = Math.max(0, Math.min(image.width - 1, x));
  const py = Math.max(0, Math.min(image.height - 1, y));
  return image.data[py * image.width + px];
}

function bilinearSample(image: GrayImage, x: number, y: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const dx = x - x0;
  const dy = y - y0;
  const top = pixel(image, x0, y0) * (1 - dx) + pixel(image, x0 + 1, y0) * dx;
  const bottom = pixel(image, x0, y0 + 1) * (1 - dx) + pixel(image, x0 + 1, y0 + 1) * dx;
  return top * (1 - dy) + bottom * dy;
}

function cubicWeight(value: number): number {
  const distance = Math.abs(value);
  if (distance <= 1) return 1.5 * distance ** 3 - 2.5 * distance ** 2 + 1;
  if (distance < 2) return -0.5 * distance ** 3 + 2.5 * distance ** 2 - 4 * distance + 2;
  return 0;
}

function bicubicSample(image: GrayImage, x: number, y: number): number {
  const radius = 2;
  let total = 0;
  let weightTotal = 0;
  for (let iy = Math.floor(y) - radius + 1; iy <= Math.floor(y) + radius; iy += 1) {
    const wy = cubicWeight(y - iy);
    for (let ix = Math.floor(x) - radius + 1; ix <= Math.floor(x) + radius; ix += 1) {
      const wx = cubicWeight(x - ix);
      const weight = wx * wy;
      total += pixel(image, ix, iy) * weight;
      weightTotal += weight;
    }
  }
  return Math.max(0, Math.min(255, total / weightTotal));
}
