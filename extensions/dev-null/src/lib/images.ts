// The server's rules for attached images (app/Actions/CreateCommitImages.php and the `images.*` rules in
// app/Http/Requests/CreateCommitRequest.php), checked before anything is signed or sent.

import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { basename, isAbsolute, join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

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

// Measured from the bytes that were read, not the path, which another app could change in between.
// The copy has a fixed name, because sips echoes the file name before the properties.
async function dimensions(data: Buffer): Promise<{ width: number; height: number } | undefined> {
  const dir = await mkdtemp(join(tmpdir(), "devnull-"));
  try {
    const copy = join(dir, "image");
    await writeFile(copy, data);
    const { stdout } = await execFileAsync("/usr/bin/sips", ["-g", "pixelWidth", "-g", "pixelHeight", copy]);
    const width = Number(stdout.match(/^\s*pixelWidth:\s*(\d+)\s*$/m)?.[1]);
    const height = Number(stdout.match(/^\s*pixelHeight:\s*(\d+)\s*$/m)?.[1]);
    return width > 0 && height > 0 ? { width, height } : undefined;
  } catch {
    return undefined;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
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

    const size2d = await dimensions(data);
    if (!size2d) throw new Error(`Could not read the dimensions of ${name}.`);
    if (size2d.width > MAX_IMAGE_DIMENSION || size2d.height > MAX_IMAGE_DIMENSION) {
      throw new Error(
        `${name} is ${size2d.width}×${size2d.height}. Images can be at most ${MAX_IMAGE_DIMENSION.toLocaleString("en-US")} pixels on a side.`,
      );
    }

    images.push({ path, name, type, data, sha256: createHash("sha256").update(data).digest("hex") });
  }
  return images;
}
