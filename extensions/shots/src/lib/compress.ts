import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import type sharp from "sharp";

const execFileAsync = promisify(execFile);

const MIN_QUALITY = 30;
const MAX_QUALITY = 95;

type CompressionFormat = "webp" | "jpeg";
type CompressionExtension = "webp" | "jpg";
type SharpFactory = typeof sharp;

export interface CompressedImage {
  buffer: Buffer;
  bytes: number;
  quality: number;
  format: CompressionFormat;
  extension: CompressionExtension;
  contentType: "image/webp" | "image/jpeg";
}

export async function compressToTarget(inputPath: string, maxBytes: number): Promise<CompressedImage> {
  if (!Number.isFinite(maxBytes) || maxBytes <= 0) {
    throw new Error("maxBytes must be a positive number.");
  }

  try {
    return await compressToWebpWithSharp(inputPath, maxBytes);
  } catch (error: unknown) {
    if (!isSharpRuntimeLoadError(error)) {
      throw error;
    }
    return compressToJpegWithSips(inputPath, maxBytes);
  }
}

async function compressToWebpWithSharp(inputPath: string, maxBytes: number): Promise<CompressedImage> {
  const sharp = await loadSharpOrThrow();

  let low = MIN_QUALITY;
  let high = MAX_QUALITY;
  let best: CompressedImage | null = null;

  while (low <= high) {
    const quality = Math.floor((low + high) / 2);
    const buffer = await encodeWebp(sharp, inputPath, quality);

    if (buffer.length <= maxBytes) {
      best = {
        buffer,
        bytes: buffer.length,
        quality,
        format: "webp",
        extension: "webp",
        contentType: "image/webp",
      };
      low = quality + 1;
    } else {
      high = quality - 1;
    }
  }

  if (best) {
    return best;
  }

  const fallbackBuffer = await encodeWebp(sharp, inputPath, MIN_QUALITY);
  return {
    buffer: fallbackBuffer,
    bytes: fallbackBuffer.length,
    quality: MIN_QUALITY,
    format: "webp",
    extension: "webp",
    contentType: "image/webp",
  };
}

async function compressToJpegWithSips(inputPath: string, maxBytes: number): Promise<CompressedImage> {
  const tempDir = await mkdtemp(join(tmpdir(), "shots-sips-"));
  const outPath = join(tempDir, "compressed.jpg");

  try {
    let low = MIN_QUALITY;
    let high = MAX_QUALITY;
    let best: CompressedImage | null = null;

    while (low <= high) {
      const quality = Math.floor((low + high) / 2);
      await encodeJpegWithSips(inputPath, outPath, quality);
      const buffer = await readFile(outPath);

      if (buffer.length <= maxBytes) {
        best = {
          buffer,
          bytes: buffer.length,
          quality,
          format: "jpeg",
          extension: "jpg",
          contentType: "image/jpeg",
        };
        low = quality + 1;
      } else {
        high = quality - 1;
      }
    }

    if (best) {
      return best;
    }

    await encodeJpegWithSips(inputPath, outPath, MIN_QUALITY);
    const fallbackBuffer = await readFile(outPath);
    return {
      buffer: fallbackBuffer,
      bytes: fallbackBuffer.length,
      quality: MIN_QUALITY,
      format: "jpeg",
      extension: "jpg",
      contentType: "image/jpeg",
    };
  } catch (error: unknown) {
    throw new Error(`Failed to compress screenshot: ${toErrorMessage(error)}`);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function encodeWebp(sharpFactory: SharpFactory, inputPath: string, quality: number): Promise<Buffer> {
  try {
    return await sharpFactory(inputPath)
      .webp({ quality, effort: 5, alphaQuality: 85, smartSubsample: true })
      .toBuffer();
  } catch (error: unknown) {
    throw new Error(`Failed to compress screenshot: ${toErrorMessage(error)}`);
  }
}

async function encodeJpegWithSips(inputPath: string, outPath: string, quality: number): Promise<void> {
  const jpegQuality = Math.max(0, Math.min(100, quality));
  await execFileAsync("sips", [
    "-s",
    "format",
    "jpeg",
    "-s",
    "formatOptions",
    String(jpegQuality),
    inputPath,
    "--out",
    outPath,
  ]);
}

async function loadSharpOrThrow(): Promise<SharpFactory> {
  try {
    const module = await import("sharp");
    const sharp = module.default;
    if (!sharp) throw new Error("sharp default export is missing.");
    return sharp as SharpFactory;
  } catch (error: unknown) {
    throw new Error(`Failed to initialize sharp: ${toErrorMessage(error)}`);
  }
}

function isSharpRuntimeLoadError(error: unknown): boolean {
  const message = toErrorMessage(error).toLowerCase();
  return message.includes('could not load the "sharp" module') || message.includes("failed to initialize sharp");
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
