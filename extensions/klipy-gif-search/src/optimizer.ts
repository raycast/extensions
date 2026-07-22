import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { environment } from "@raycast/api";
import {
  decode,
  decodeFrames,
  encode,
  type DecodedFrame,
  type UnencodedFrame,
} from "modern-gif";
import type { GifItem } from "./types";

const MAX_DOWNLOAD_BYTES = 100 * 1024 * 1024;
const MAX_DECODED_PIXELS = 300_000_000;

export interface OptimizeOptions {
  maxBytes: number;
  maxDimension: number;
  forceOptimization?: boolean;
}

function scaleFrame(
  frame: DecodedFrame,
  width: number,
  height: number,
): DecodedFrame {
  if (frame.width === width && frame.height === height) return frame;
  const output = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    const sourceY = Math.min(
      frame.height - 1,
      Math.floor((y * frame.height) / height),
    );
    for (let x = 0; x < width; x++) {
      const sourceX = Math.min(
        frame.width - 1,
        Math.floor((x * frame.width) / width),
      );
      const source = (sourceY * frame.width + sourceX) * 4;
      const target = (y * width + x) * 4;
      output[target] = frame.data[source];
      output[target + 1] = frame.data[source + 1];
      output[target + 2] = frame.data[source + 2];
      output[target + 3] = frame.data[source + 3];
    }
  }
  return { width, height, delay: frame.delay, data: output };
}

export function sampleFrames(
  frames: DecodedFrame[],
  step: number,
): DecodedFrame[] {
  if (step === 1) return frames;
  const sampled: DecodedFrame[] = [];
  for (let index = 0; index < frames.length; index += step) {
    const group = frames.slice(index, index + step);
    sampled.push({
      ...group[group.length - 1],
      delay: group.reduce((sum, frame) => sum + frame.delay, 0),
    });
  }
  return sampled;
}

export async function optimizeGif(
  input: Uint8Array,
  options: OptimizeOptions,
): Promise<Uint8Array> {
  if (input.byteLength > MAX_DOWNLOAD_BYTES)
    throw new Error("GIF is larger than the 100 MB safety limit");
  const gif = decode(input as unknown as ArrayBuffer);
  const decodedPixels = gif.width * gif.height * Math.max(gif.frames.length, 1);
  if (decodedPixels > MAX_DECODED_PIXELS)
    throw new Error("GIF has too many decoded pixels to process safely");

  if (
    !options.forceOptimization &&
    input.byteLength <= options.maxBytes &&
    Math.max(gif.width, gif.height) <= options.maxDimension
  )
    return input;
  const frames = decodeFrames(input as unknown as ArrayBuffer, { gif });
  const dimensionScale = Math.min(
    1,
    options.maxDimension / Math.max(gif.width, gif.height),
  );
  const sizeScale = Math.min(
    1,
    Math.sqrt(options.maxBytes / input.byteLength) * 0.94,
  );
  const startingScale = Math.min(dimensionScale, sizeScale);
  const attempts = [
    { scale: startingScale, colors: 128, step: 1 },
    { scale: startingScale * 0.9, colors: 96, step: 1 },
    { scale: startingScale * 0.78, colors: 64, step: 1 },
    { scale: startingScale * 0.68, colors: 48, step: 2 },
    { scale: startingScale * 0.56, colors: 32, step: 2 },
    { scale: startingScale * 0.44, colors: 24, step: 3 },
    { scale: startingScale * 0.34, colors: 16, step: 4 },
    { scale: startingScale * 0.25, colors: 12, step: 6 },
    { scale: startingScale * 0.18, colors: 8, step: 8 },
    {
      scale: Math.min(
        startingScale * 0.12,
        32 / Math.max(gif.width, gif.height),
      ),
      colors: 4,
      step: Math.max(12, Math.ceil(frames.length / 40)),
    },
  ];
  let smallest: Uint8Array | undefined;
  for (const attempt of attempts) {
    const width = Math.max(1, Math.round(gif.width * attempt.scale));
    const height = Math.max(1, Math.round(gif.height * attempt.scale));
    const prepared: UnencodedFrame[] = sampleFrames(frames, attempt.step).map(
      (frame) => {
        const scaled = scaleFrame(frame, width, height);
        return {
          ...scaled,
          data: scaled.data as unknown as ArrayBufferView<ArrayBuffer>,
        };
      },
    );
    const encoded = new Uint8Array(
      await encode({
        width,
        height,
        frames: prepared,
        maxColors: attempt.colors,
        looped: gif.looped ?? true,
        loopCount: gif.loopCount ?? 0,
      }),
    );
    if (!smallest || encoded.byteLength < smallest.byteLength)
      smallest = encoded;
    if (encoded.byteLength <= options.maxBytes) return encoded;
  }
  if (!smallest) throw new Error("Could not encode GIF");
  throw new Error(
    `Could not compress this GIF below ${Math.round(options.maxBytes / 1024)} KB (smallest result: ${Math.round(smallest.byteLength / 1024)} KB)`,
  );
}

export async function readResponseBytes(
  response: Response,
  maxBytes: number,
): Promise<Uint8Array> {
  const declaredSize = Number(response.headers.get("content-length") ?? 0);
  if (declaredSize > maxBytes)
    throw new Error("GIF is larger than the 100 MB safety limit");
  if (!response.body) return new Uint8Array();

  const chunks: Uint8Array[] = [];
  const reader = response.body.getReader();
  let receivedBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      receivedBytes += value.byteLength;
      if (receivedBytes > maxBytes) {
        await reader.cancel();
        throw new Error("GIF is larger than the 100 MB safety limit");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const downloaded = new Uint8Array(receivedBytes);
  let offset = 0;
  for (const chunk of chunks) {
    downloaded.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return downloaded;
}

async function download(url: string): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(`Could not download GIF (${response.status})`);
  return readResponseBytes(response, MAX_DOWNLOAD_BYTES);
}

function cachePath(key: string) {
  return path.join(
    environment.supportPath,
    "optimized",
    `${createHash("sha256").update(key).digest("hex")}.gif`,
  );
}

export async function optimizedFileFor(
  item: GifItem,
  options: OptimizeOptions & { thresholdBytes?: number },
): Promise<{ path: string; bytes: number }> {
  const localFile = item.localPath
    ? await fs.stat(item.localPath).catch(() => undefined)
    : undefined;
  const knownOriginalBytes =
    localFile?.size ??
    item.originalSize ??
    item.renditions?.find((candidate) => candidate.url === item.originalUrl)
      ?.size;
  if (
    options.thresholdBytes !== undefined &&
    knownOriginalBytes !== undefined &&
    knownOriginalBytes <= options.thresholdBytes
  ) {
    return originalFileFor(item);
  }

  const rendition = item.renditions
    ?.filter(
      (candidate) => candidate.size && candidate.size <= options.maxBytes,
    )
    .sort((a, b) => (b.size ?? 0) - (a.size ?? 0))[0];
  const source = item.localPath ?? rendition?.url ?? item.originalUrl;
  const output = cachePath(
    `${source}:${options.maxBytes}:${options.maxDimension}:${options.thresholdBytes ?? "none"}`,
  );
  await fs.mkdir(path.dirname(output), { recursive: true });
  const existing = await fs.stat(output).catch(() => undefined);
  if (existing?.isFile()) return { path: output, bytes: existing.size };
  const input = item.localPath
    ? new Uint8Array(await fs.readFile(item.localPath))
    : await download(source);
  const optimized = await optimizeGif(input, {
    ...options,
    forceOptimization:
      options.thresholdBytes !== undefined &&
      knownOriginalBytes !== undefined &&
      knownOriginalBytes > options.thresholdBytes,
  });
  await fs.writeFile(output, optimized);
  return { path: output, bytes: optimized.byteLength };
}

export async function originalFileFor(
  item: GifItem,
): Promise<{ path: string; bytes: number }> {
  if (item.localPath) {
    const file = await fs.stat(item.localPath);
    return { path: item.localPath, bytes: file.size };
  }

  const output = path.join(
    environment.supportPath,
    "original",
    `${createHash("sha256").update(item.originalUrl).digest("hex")}.gif`,
  );
  await fs.mkdir(path.dirname(output), { recursive: true });
  const existing = await fs.stat(output).catch(() => undefined);
  if (existing?.isFile()) return { path: output, bytes: existing.size };

  const original = await download(item.originalUrl);
  await fs.writeFile(output, original);
  return { path: output, bytes: original.byteLength };
}
