import { execFile } from "child_process";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const SIPS = "/usr/bin/sips";

/** Formats the SVG.new API takes as they are. */
const SENT_AS_IS: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

/** Formats converted to PNG on the Mac (with the built-in sips tool) before upload. */
const CONVERTED = [".heic", ".tif", ".tiff", ".avif", ".gif", ".bmp"];

export const SUPPORTED_EXTENSIONS = [...Object.keys(SENT_AS_IS), ...CONVERTED];

/** The API takes images inline, and its request bodies are capped at 4.5 MB (3 MB before base64). */
export const MAX_IMAGE_BYTES = 3_000_000;

/** Longest side, in pixels, that larger images are scaled down to. */
const MAX_SIDE = 2560;

/** A problem with the user's input, shown as the toast title. */
export class InputError extends Error {
  constructor(
    message: string,
    public detail?: string,
  ) {
    super(message);
    this.name = "InputError";
  }
}

export function isSupportedImage(filePath: string): boolean {
  return SUPPORTED_EXTENSIONS.includes(path.extname(filePath).toLowerCase());
}

export function unsupportedImageError(): InputError {
  return new InputError("Unsupported file type", "Use PNG, JPG, WebP, HEIC, TIFF, AVIF, GIF or BMP");
}

/** Reads an image file as a base64 data URL the API accepts, converting or scaling it down when needed. */
export async function readImageAsDataUrl(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  let bytes: Buffer;
  let mime: string;

  if (SENT_AS_IS[ext]) {
    bytes = await fs.readFile(filePath);
    mime = SENT_AS_IS[ext];
  } else if (CONVERTED.includes(ext)) {
    bytes = await sips(filePath, ["-s", "format", "png"], ".png");
    mime = "image/png";
  } else {
    throw unsupportedImageError();
  }

  if (bytes.length > MAX_IMAGE_BYTES) {
    ({ bytes, mime } = await scaleDown(filePath));
  }
  if (bytes.length > MAX_IMAGE_BYTES) {
    throw new InputError("Image is too large", `Use an image under ${MAX_IMAGE_BYTES / 1_000_000} MB`);
  }

  return `data:${mime};base64,${bytes.toString("base64")}`;
}

/** Scales an image down to fit the upload limit: PNG when it has transparency, JPEG otherwise. */
async function scaleDown(filePath: string): Promise<{ bytes: Buffer; mime: string }> {
  const { stdout } = await execFileAsync(SIPS, ["-g", "pixelWidth", "-g", "pixelHeight", "-g", "hasAlpha", filePath]);
  const width = Number(/pixelWidth: (\d+)/.exec(stdout)?.[1] ?? 0);
  const height = Number(/pixelHeight: (\d+)/.exec(stdout)?.[1] ?? 0);
  const hasAlpha = /hasAlpha: yes/.test(stdout);
  const longest = Math.max(width, height);
  const side = longest > MAX_SIDE ? MAX_SIDE : Math.round(longest * 0.7);

  if (hasAlpha) {
    return { bytes: await sips(filePath, ["-s", "format", "png", "-Z", String(side)], ".png"), mime: "image/png" };
  }
  const args = ["-s", "format", "jpeg", "-s", "formatOptions", "90", "-Z", String(side)];
  return { bytes: await sips(filePath, args, ".jpg"), mime: "image/jpeg" };
}

/** Runs sips on a copy of the image and returns the output file's bytes. */
async function sips(filePath: string, args: string[], outputExt: string): Promise<Buffer> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "svg-new-"));
  const output = path.join(dir, `image${outputExt}`);
  try {
    await execFileAsync(SIPS, [...args, filePath, "--out", output]);
    return await fs.readFile(output);
  } catch {
    throw new InputError("Could not read the image", path.basename(filePath));
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}
