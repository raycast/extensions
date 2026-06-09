import { execFile } from "child_process";
import { randomUUID } from "crypto";
import { readFile, rm } from "fs/promises";
import os from "os";
import path from "path";
import { promisify } from "util";
import { environment } from "@raycast/api";
import encodeWebp, { init as initWebpEncoder } from "@jsquash/webp/encode";
import { PNG } from "pngjs";
import { simd } from "wasm-feature-detect";
import { apiFetch } from "./api";

const execFileAsync = promisify(execFile);

export const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
const ALLOWED_EXTS = new Set(ALLOWED_IMAGE_EXTENSIONS);
const MAX_BYTES = 5 * 1024 * 1024;

export function isAllowedImagePath(filePath: string): boolean {
  return ALLOWED_EXTS.has(path.extname(filePath).toLowerCase());
}

type UploadUrlsResponse = {
  success: true;
  fullUploadUrl: string;
  thumbnailUploadUrl: string;
  key: string;
};

/**
 * Pick a local image, resize it to match the web app's exact sharp config
 * (full = height 900 @ quality 85; thumbnail = height 450 @ quality 80, see
 * lib/server/image-storage.ts:uploadWishlistItemImage), upload both webp
 * versions to the presigned R2 PUTs returned by /api/v1/upload/items/upload-url,
 * and return the storage filename to pass as `imageKey` on item create.
 *
 * Uses macOS `sips` (built-in) for resize + intermediate PNG, then encodes the
 * webp in WebAssembly (@jsquash/webp). macOS-only by design (the `platforms`
 * manifest field is already restricted to "macOS" for `sips`). The encoder's
 * wasm lives in assets/webp/.
 */
export async function uploadItemImage(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  if (!ALLOWED_EXTS.has(ext)) {
    throw new Error(`Unsupported file type "${ext}". Use JPG, PNG, WebP, or GIF.`);
  }

  const rawBuffer = await readFile(filePath);
  if (rawBuffer.length > MAX_BYTES) {
    const mb = (rawBuffer.length / 1024 / 1024).toFixed(1);
    throw new Error(`Image is too large (${mb} MB). Max is 5 MB.`);
  }

  const [fullBuf, thumbBuf] = await Promise.all([
    resizeAndEncodeWebp(filePath, 900, 85),
    resizeAndEncodeWebp(filePath, 450, 80),
  ]);

  const { fullUploadUrl, thumbnailUploadUrl, key } = await apiFetch<UploadUrlsResponse>(
    "/api/v1/upload/items/upload-url",
    { method: "POST" },
  );

  const [fullPut, thumbPut] = await Promise.all([
    fetch(fullUploadUrl, {
      method: "PUT",
      headers: { "Content-Type": "image/webp" },
      body: fullBuf,
    }),
    fetch(thumbnailUploadUrl, {
      method: "PUT",
      headers: { "Content-Type": "image/webp" },
      body: thumbBuf,
    }),
  ]);
  if (!fullPut.ok) throw new Error(`Full upload failed (${fullPut.status})`);
  if (!thumbPut.ok) throw new Error(`Thumbnail upload failed (${thumbPut.status})`);

  return key;
}

/**
 * sips → intermediate PNG (sips handles JPG/PNG/WebP/GIF decode + resize
 * natively), then decode that PNG to raw RGBA with pngjs and encode it to webp
 * in WebAssembly. The temp PNG is unlinked before return.
 */
async function resizeAndEncodeWebp(srcPath: string, height: number, quality: number): Promise<Buffer> {
  const tmpPng = path.join(os.tmpdir(), `wishapp-${randomUUID()}.png`);
  try {
    await execFileAsync("sips", ["--resampleHeight", String(height), "-s", "format", "png", srcPath, "--out", tmpPng]);
    const png = PNG.sync.read(await readFile(tmpPng));
    await ensureWebpEncoder();
    const webp = await encodeWebp(
      { data: new Uint8ClampedArray(png.data), width: png.width, height: png.height },
      {
        quality,
      },
    );
    return Buffer.from(webp);
  } finally {
    await rm(tmpPng, { force: true });
  }
}

let webpEncoderReady: Promise<unknown> | undefined;

/**
 * Initialise the @jsquash/webp encoder once. We hand its emscripten glue the
 * wasm bytes directly (`wasmBinary`) plus a `locateFile`. The `locateFile` is
 * what matters: without it the glue runs `new URL(file, import.meta.url)`, and
 * `import.meta.url` is undefined in Raycast's bundled runtime (it isn't detected
 * as Node, so the encoder's own `https://localhost` fallback never kicks in) —
 * which throws "Invalid URL". With `locateFile` set that branch is skipped, and
 * `wasmBinary` means the wasm is instantiated from memory, never fetched. The
 * SIMD build is faster but needs CPU support, so pick the variant the host runs.
 */
function ensureWebpEncoder(): Promise<unknown> {
  webpEncoderReady ??= (async () => {
    const wasmFile = (await simd()) ? "webp_enc_simd.wasm" : "webp_enc.wasm";
    const wasmBinary = await readFile(path.join(environment.assetsPath, "webp", wasmFile));
    return initWebpEncoder({ wasmBinary, locateFile: (p: string) => p });
  })();
  return webpEncoderReady;
}
