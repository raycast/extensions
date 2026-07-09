import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, open, readFile, rename, stat } from "node:fs/promises";
import { promisify } from "node:util";
import { basename, extname, join } from "node:path";
import { Attachment } from "./types";

export const MAX_ATTACHMENTS_PER_MESSAGE = 5;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_TEXT_BYTES = 200 * 1024;
export const MAX_IMAGE_DIMENSION = 2048;

const execFileAsync = promisify(execFile);

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "gif"]);
const TEXT_EXTENSIONS = new Set([
  "md",
  "txt",
  "json",
  "ts",
  "tsx",
  "js",
  "jsx",
  "py",
  "rb",
  "go",
  "rs",
  "swift",
  "kt",
  "java",
  "c",
  "cpp",
  "h",
  "css",
  "html",
  "xml",
  "yml",
  "yaml",
  "toml",
  "csv",
  "log",
  "sh",
]);

const IMAGE_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

function ext(path: string): string {
  return extname(path).slice(1).toLowerCase();
}

export function mimeForImage(path: string): string {
  return IMAGE_MIME[ext(path)] ?? "image/png";
}

async function imageDimensions(
  path: string,
): Promise<{ width: number; height: number } | null> {
  try {
    const { stdout } = await execFileAsync("sips", [
      "-g",
      "pixelWidth",
      "-g",
      "pixelHeight",
      path,
    ]);
    const width = Number(/pixelWidth: (\d+)/.exec(stdout)?.[1]);
    const height = Number(/pixelHeight: (\d+)/.exec(stdout)?.[1]);
    if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
    return { width, height };
  } catch {
    return null;
  }
}

/**
 * Downscale an image to maxDimension (long edge) as a cached JPEG copy
 * inside cacheDir. The cache key includes mtime, size, and the target
 * dimension, so an edited original produces a fresh copy while repeats
 * reuse the existing one. The conversion writes to a unique temp path and
 * atomically renames into place, so concurrent calls cannot tear the cache
 * file.
 */
export async function downscaleImage(
  path: string,
  cacheDir: string,
  maxDimension: number = MAX_IMAGE_DIMENSION,
): Promise<string> {
  const s = await stat(path);
  const hash = createHash("sha1")
    .update(`${path}:${s.mtimeMs}:${s.size}:${maxDimension}`)
    .digest("hex")
    .slice(0, 16);
  const dest = join(cacheDir, `${hash}.jpg`);
  try {
    await stat(dest);
    return dest;
  } catch {
    // not cached yet
  }
  await mkdir(cacheDir, { recursive: true });
  const temp = join(
    cacheDir,
    `.${hash}-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.tmp.jpg`,
  );
  await execFileAsync("sips", [
    "-Z",
    String(maxDimension),
    "-s",
    "format",
    "jpeg",
    "-s",
    "formatOptions",
    "85",
    path,
    "--out",
    temp,
  ]);
  await rename(temp, dest);
  return dest;
}

/**
 * Detect an image by its magic bytes. Needed because Raycast materializes
 * clipboard screenshots as extensionless files (e.g. "Image (1832×1522)"),
 * and users attach TIFF/HEIC files whose extensions are not in the API-safe
 * allowlist — extension checks alone misroute all of these to the text path.
 */
async function sniffImageKind(path: string): Promise<string | null> {
  let head: Buffer;
  try {
    const handle = await open(path, "r");
    try {
      const buffer = Buffer.alloc(16);
      const { bytesRead } = await handle.read(buffer, 0, 16, 0);
      head = buffer.subarray(0, bytesRead);
    } finally {
      await handle.close();
    }
  } catch {
    return null;
  }
  if (
    head.length >= 8 &&
    head
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return "png";
  }
  if (
    head.length >= 3 &&
    head[0] === 0xff &&
    head[1] === 0xd8 &&
    head[2] === 0xff
  ) {
    return "jpeg";
  }
  const ascii = head.toString("latin1");
  if (ascii.startsWith("GIF87a") || ascii.startsWith("GIF89a")) return "gif";
  if (
    head.length >= 12 &&
    ascii.startsWith("RIFF") &&
    ascii.slice(8, 12) === "WEBP"
  ) {
    return "webp";
  }
  if (ascii.startsWith("II*\u0000") || ascii.startsWith("MM\u0000*"))
    return "tiff";
  if (head.length >= 12 && ascii.slice(4, 8) === "ftyp") return "heic";
  return null;
}

export type ClassifyResult =
  { ok: true; attachment: Attachment } | { ok: false; reason: string };

/**
 * Classify a filesystem path as an image or text attachment, enforcing the
 * spec's size limits. Text content is frozen here so later edits/deletion of
 * the file do not change the conversation context.
 */
export async function classifyPath(
  path: string,
  options?: { imageCacheDir?: string },
): Promise<ClassifyResult> {
  const name = basename(path);
  let size: number;
  try {
    const s = await stat(path);
    if (!s.isFile()) return { ok: false, reason: `${name}: not a file` };
    size = s.size;
  } catch {
    return { ok: false, reason: `${name}: cannot read file` };
  }

  if (IMAGE_EXTENSIONS.has(ext(path))) {
    const dimensions = await imageDimensions(path);
    const oversized =
      size > MAX_IMAGE_BYTES ||
      (dimensions !== null &&
        Math.max(dimensions.width, dimensions.height) > MAX_IMAGE_DIMENSION);
    if (!oversized) {
      return { ok: true, attachment: { type: "image", path, name } };
    }
    if (!options?.imageCacheDir) {
      return { ok: false, reason: `${name}: image larger than 10 MB` };
    }
    try {
      // Cap the target at the source's real long edge: sips -Z would
      // otherwise upscale a >10 MB image whose resolution is already small.
      const target =
        dimensions !== null
          ? Math.min(
              MAX_IMAGE_DIMENSION,
              Math.max(dimensions.width, dimensions.height),
            )
          : MAX_IMAGE_DIMENSION;
      const downscaled = await downscaleImage(
        path,
        options.imageCacheDir,
        target,
      );
      return {
        ok: true,
        attachment: { type: "image", path: downscaled, name },
      };
    } catch {
      return { ok: false, reason: `${name}: could not downscale image` };
    }
  }

  // Unknown extension but image content (clipboard screenshots are
  // extensionless; TIFF/HEIC are real images the API can't take as-is):
  // normalize through sips to an API-safe JPEG copy. Must run BEFORE the
  // text-size check — screenshots are far larger than the text limit.
  if (!TEXT_EXTENSIONS.has(ext(path))) {
    const imageKind = await sniffImageKind(path);
    if (imageKind !== null) {
      if (!options?.imageCacheDir) {
        return { ok: false, reason: `${name}: unsupported file type` };
      }
      const dimensions = await imageDimensions(path);
      const target =
        dimensions !== null
          ? Math.min(
              MAX_IMAGE_DIMENSION,
              Math.max(dimensions.width, dimensions.height),
            )
          : MAX_IMAGE_DIMENSION;
      try {
        const converted = await downscaleImage(
          path,
          options.imageCacheDir,
          target,
        );
        return {
          ok: true,
          attachment: { type: "image", path: converted, name },
        };
      } catch {
        return { ok: false, reason: `${name}: could not downscale image` };
      }
    }
  }

  if (size > MAX_TEXT_BYTES) {
    return { ok: false, reason: `${name}: text file larger than 200 KB` };
  }
  const buffer = await readFile(path);
  if (!TEXT_EXTENSIONS.has(ext(path))) {
    if (buffer.includes(0)) {
      return { ok: false, reason: `${name}: unsupported file type` };
    }
    try {
      new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    } catch {
      return { ok: false, reason: `${name}: unsupported file type` };
    }
  }
  return {
    ok: true,
    attachment: { type: "text", path, name, content: buffer.toString("utf-8") },
  };
}
