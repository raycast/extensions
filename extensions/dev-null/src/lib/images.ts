// The server's rules for attached images (app/Actions/CreateCommitImages.php and the `images.*` rules in
// app/Http/Requests/CreateCommitRequest.php), checked before anything is signed or sent.

import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { basename, isAbsolute, join } from "node:path";

export const MAX_IMAGES = 3;
// The official script's limit, a little under the server's 10 MB (10,485,760 bytes).
export const MAX_IMAGE_BYTES = 10_240_000;
export const MAX_IMAGE_DIMENSION = 6000;

export type ImageType = "image/jpeg" | "image/png" | "image/webp";

export interface Image {
  path: string;
  name: string;
  type: ImageType;
  data: Buffer;
  /** SHA-256 of `data`, hex. The signature covers it, so it must be of the exact bytes that are uploaded. */
  sha256: string;
}

/** The server checks an image's contents, not its extension, so this does too. */
export function sniffType(data: Buffer): ImageType | undefined {
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return "image/jpeg";
  if (data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (data.toString("latin1", 0, 4) === "RIFF" && data.toString("latin1", 8, 12) === "WEBP") return "image/webp";
  return undefined;
}

type Size = { width: number; height: number };

const positive = (size: Size): Size | undefined => (size.width > 0 && size.height > 0 ? size : undefined);

/**
 * An image's size in pixels, read from its header the way PHP's getimagesize() does, which is how the server
 * measures it (app/Actions/CreateImageFiles.php). Like getimagesize(), it ignores EXIF rotation. Measured from the
 * bytes that were read, not the path, which another app could change in between. Undefined if the header is cut off.
 */
export function imageSize(data: Buffer): Size | undefined {
  try {
    switch (sniffType(data)) {
      case "image/png":
        // The IHDR chunk always comes first: 13 bytes, starting with the width and height, then its CRC.
        return data.length >= 33 && data.readUInt32BE(8) === 13 && data.toString("latin1", 12, 16) === "IHDR"
          ? positive({ width: data.readUInt32BE(16), height: data.readUInt32BE(20) })
          : undefined;
      case "image/jpeg":
        return jpegSize(data);
      case "image/webp":
        return webpSize(data);
      default:
        return undefined;
    }
  } catch {
    // A read past the end of a truncated header.
    return undefined;
  }
}

// Walks the segments to the first start-of-frame marker (C0–CF, except C4, C8 and CC, which aren't frames).
function jpegSize(data: Buffer): Size | undefined {
  let offset = 2;
  while (offset + 4 <= data.length) {
    if (data[offset] !== 0xff) return undefined;
    const marker = data[offset + 1];
    // Fill bytes before a marker.
    if (marker === 0xff) {
      offset += 1;
      continue;
    }
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return positive({ height: data.readUInt16BE(offset + 5), width: data.readUInt16BE(offset + 7) });
    }
    offset += 2 + data.readUInt16BE(offset + 2);
  }
  return undefined;
}

// The first chunk after "WEBP" says which form it is, and each keeps the size in its own place.
function webpSize(data: Buffer): Size | undefined {
  const chunk = data.toString("latin1", 12, 16);
  if (chunk === "VP8 ") {
    // A key frame's start code comes right before the size.
    if (data[23] !== 0x9d || data[24] !== 0x01 || data[25] !== 0x2a) return undefined;
    return positive({ width: data.readUInt16LE(26) & 0x3fff, height: data.readUInt16LE(28) & 0x3fff });
  }
  if (chunk === "VP8L") {
    // The signature byte, then the size.
    if (data[20] !== 0x2f) return undefined;
    const bits = data.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (chunk === "VP8X") {
    return { width: data.readUIntLE(24, 3) + 1, height: data.readUIntLE(27, 3) + 1 };
  }
  return undefined;
}

const PREVIEW_DIR = join(tmpdir(), "devnull-preview");
const PREVIEW_MAX_AGE_MS = 60 * 60 * 1000;

/**
 * Writes an image's bytes to the preview folder, so a confirmation shows exactly what will be posted.
 * Each file is named by its hash, so a preview never changes under a confirmation that shows it.
 * Previews older than an hour are removed.
 */
export async function writePreview(image: Image): Promise<string> {
  await mkdir(PREVIEW_DIR, { recursive: true, mode: 0o700 });
  for (const name of await readdir(PREVIEW_DIR).catch(() => [])) {
    const old = join(PREVIEW_DIR, name);
    const info = await stat(old).catch(() => undefined);
    if (info && Date.now() - info.mtimeMs > PREVIEW_MAX_AGE_MS) await rm(old, { force: true });
  }
  const path = join(PREVIEW_DIR, `${image.sha256}.${image.type.slice("image/".length)}`);
  await writeFile(path, image.data, { mode: 0o600 });
  return path;
}

/** Expands a leading `~`, since the AI and people both write paths that way. */
export function resolvePath(path: string): string {
  const trimmed = path.trim();
  return trimmed === "~" || trimmed.startsWith("~/") ? join(homedir(), trimmed.slice(1)) : trimmed;
}

/**
 * Reads and checks each image, in order. Throws an error naming the first file /dev/null would refuse, and why.
 * The bytes returned are the ones to hash, sign and upload, so a file that changes afterward can't slip through.
 */
export async function loadImages(paths: string[]): Promise<Image[]> {
  if (paths.length > MAX_IMAGES) throw new Error(`A commit can carry up to ${MAX_IMAGES} images.`);

  const images: Image[] = [];
  for (const rawPath of paths) {
    const path = resolvePath(rawPath);
    const name = basename(path);
    if (!isAbsolute(path)) throw new Error(`${rawPath} is not a full path to an image.`);

    let size: number;
    try {
      const info = await stat(path);
      if (!info.isFile()) throw new Error("not a file");
      size = info.size;
    } catch {
      throw new Error(`Could not read the image ${name}.`);
    }
    if (size > MAX_IMAGE_BYTES) throw new Error(`${name} is larger than 10 MB.`);

    const data = await readFile(path).catch(() => {
      throw new Error(`Could not read the image ${name}.`);
    });
    // Checked again on the bytes read: the file may have grown since `stat`.
    if (data.length > MAX_IMAGE_BYTES) throw new Error(`${name} is larger than 10 MB.`);
    const type = sniffType(data);
    if (!type) throw new Error(`${name} is not a JPEG, PNG or WebP image.`);

    const size2d = imageSize(data);
    if (!size2d) throw new Error(`Could not read the dimensions of ${name}.`);
    if (size2d.width > MAX_IMAGE_DIMENSION || size2d.height > MAX_IMAGE_DIMENSION) {
      throw new Error(
        `${name} is ${size2d.width}×${size2d.height}. Images can be at most ${MAX_IMAGE_DIMENSION.toLocaleString()} pixels on a side.`,
      );
    }

    images.push({ path, name, type, data, sha256: createHash("sha256").update(data).digest("hex") });
  }
  return images;
}
