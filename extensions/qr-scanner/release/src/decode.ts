import { environment } from "@raycast/api";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import jsQR from "jsqr";
import { PNG } from "pngjs";

const execFileAsync = promisify(execFile);

/**
 * Decode a single QR code from a PNG file.
 * Returns the decoded string, or undefined if no QR code was found.
 */
export async function decodeQrFromPng(path: string) {
  if (process.platform === "darwin") {
    const results = await decodeWithVision(path);
    if (results.length > 0) {
      return results[0];
    }
    return undefined;
  }
  return decodeQrFromPngWithJsQR(path);
}

/**
 * Decode all QR codes from a PNG file.
 * Returns an array of unique decoded strings.
 */
export async function decodeQrsFromPng(path: string) {
  if (process.platform === "darwin") {
    return decodeWithVision(path);
  }
  return decodeQrsFromPngWithJsQR(path);
}

/**
 * Use Apple's Vision framework (via Swift script interpreter) for
 * hardware-accelerated QR detection. Finds all QR codes in a single pass.
 */
async function decodeWithVision(path: string): Promise<string[]> {
  try {
    const scriptPath = join(environment.assetsPath, "detect-qr.swift");
    const { stdout } = await execFileAsync("swift", [scriptPath, path]);
    const lines = stdout.trim().split("\n").filter(Boolean);
    return [...new Set(lines)];
  } catch {
    // Fall back to jsQR if Swift execution fails
    return decodeQrsFromPngWithJsQR(path);
  }
}

// ---------------------------------------------------------------------------
// jsQR fallback (used on Windows or if Vision framework is unavailable)
// ---------------------------------------------------------------------------

async function decodeQrFromPngWithJsQR(path: string) {
  const pngBuffer = await readFile(path);
  const image = PNG.sync.read(pngBuffer);
  return decodeImage(image.data, image.width, image.height);
}

async function decodeQrsFromPngWithJsQR(path: string) {
  const pngBuffer = await readFile(path);
  const image = PNG.sync.read(pngBuffer);
  const contents = new Set<string>();
  const fullImageContent = decodeImage(image.data, image.width, image.height);

  if (fullImageContent) {
    contents.add(fullImageContent);
  }

  for (const content of decodeImageRegions(image)) {
    contents.add(content);
  }

  return [...contents];
}

function decodeImage(data: Uint8Array, width: number, height: number) {
  const clampedData = new Uint8ClampedArray(
    data.buffer,
    data.byteOffset,
    data.byteLength,
  );

  // attemptBoth takes 2x the time, especially when there's no QR code.
  // We use dontInvert to make the scan significantly faster.
  const result = jsQR(clampedData, width, height, {
    inversionAttempts: "dontInvert",
  });

  return result?.data;
}

function decodeImageRegions(image: PNG) {
  const contents = new Set<string>();

  for (const region of getScanRegions(image.width, image.height)) {
    const cropped = cropImage(image.data, image.width, region);
    const decoded = decodeImage(cropped.data, cropped.width, cropped.height);

    if (decoded) {
      contents.add(decoded);
    }

    if (cropped.width <= 900 && cropped.height <= 900) {
      const scaled = scaleImage(cropped.data, cropped.width, cropped.height, 2);
      const decodedScaled = decodeImage(
        scaled.data,
        scaled.width,
        scaled.height,
      );

      if (decodedScaled) {
        contents.add(decodedScaled);
      }
    }
  }

  return contents;
}

function getScanRegions(width: number, height: number) {
  const regions: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
  }> = [];
  const tileSizes = [1200, 800, 500];

  for (const tileSize of tileSizes) {
    const regionWidth = Math.min(tileSize, width);
    const regionHeight = Math.min(tileSize, height);
    const stepX = Math.max(1, Math.floor(regionWidth * 0.55));
    const stepY = Math.max(1, Math.floor(regionHeight * 0.55));
    const xs = getScanOffsets(width, regionWidth, stepX);
    const ys = getScanOffsets(height, regionHeight, stepY);

    for (const y of ys) {
      for (const x of xs) {
        regions.push({ x, y, width: regionWidth, height: regionHeight });
      }
    }
  }

  return regions;
}

function getScanOffsets(totalSize: number, regionSize: number, step: number) {
  const offsets = new Set<number>([0, Math.max(0, totalSize - regionSize)]);

  for (let offset = 0; offset + regionSize < totalSize; offset += step) {
    offsets.add(offset);
  }

  return [...offsets].sort((a, b) => a - b);
}

function cropImage(
  source: Uint8Array,
  sourceWidth: number,
  region: { x: number; y: number; width: number; height: number },
) {
  const cropped = new Uint8Array(region.width * region.height * 4);

  for (let y = 0; y < region.height; y += 1) {
    const sourceStart = ((region.y + y) * sourceWidth + region.x) * 4;
    const sourceEnd = sourceStart + region.width * 4;
    const targetStart = y * region.width * 4;

    cropped.set(source.subarray(sourceStart, sourceEnd), targetStart);
  }

  return { data: cropped, width: region.width, height: region.height };
}

function scaleImage(
  source: Uint8Array,
  sourceWidth: number,
  sourceHeight: number,
  scale: number,
) {
  const scaledWidth = sourceWidth * scale;
  const scaledHeight = sourceHeight * scale;
  const scaled = new Uint8Array(scaledWidth * scaledHeight * 4);

  for (let y = 0; y < scaledHeight; y += 1) {
    for (let x = 0; x < scaledWidth; x += 1) {
      const sourceX = Math.floor(x / scale);
      const sourceY = Math.floor(y / scale);
      const sourceIndex = (sourceY * sourceWidth + sourceX) * 4;
      const targetIndex = (y * scaledWidth + x) * 4;

      scaled[targetIndex] = source[sourceIndex];
      scaled[targetIndex + 1] = source[sourceIndex + 1];
      scaled[targetIndex + 2] = source[sourceIndex + 2];
      scaled[targetIndex + 3] = source[sourceIndex + 3];
    }
  }

  return { data: scaled, width: scaledWidth, height: scaledHeight };
}
