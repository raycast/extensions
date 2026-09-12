import { Clipboard } from "@raycast/api";
import { execFile } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const IMAGE_EXT_TO_MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

const SUPPORTED_IMAGE_MIME = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

const PASTEBOARD_IMAGE_SCRIPT = `
on writeClip(classRef, ext)
  set basePath to system attribute "RMS_CLIP_BASE"
  set outPath to basePath & ext
  set imageData to the clipboard as classRef
  set fileRef to open for access POSIX file outPath with write permission
  set eof of fileRef to 0
  write imageData to fileRef
  close access fileRef
  return outPath
end writeClip

try
  return my writeClip(«class PNGf», ".png")
on error
  try
    return my writeClip(«class JPEG», ".jpg")
  on error
    try
      return my writeClip(«class TIFF», ".tiff")
    on error
      error "No image on clipboard"
    end try
  end try
end try
`.trim();

export class ClipboardImageError extends Error {
  constructor(
    public readonly kind: "empty" | "unsupported",
    message: string,
  ) {
    super(message);
    this.name = "ClipboardImageError";
  }
}

export function mimeTypeForImagePath(filePath: string): string | undefined {
  const ext = extname(filePath).toLowerCase();
  return IMAGE_EXT_TO_MIME[ext];
}

export function detectImageMediaType(buf: Buffer): string | undefined {
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return "image/png";
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg";
  }
  if (buf.length >= 6 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) {
    return "image/gif";
  }
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    return "image/webp";
  }
  if (buf.length >= 4 && ((buf[0] === 0x49 && buf[1] === 0x49) || (buf[0] === 0x4d && buf[1] === 0x4d))) {
    return "image/tiff";
  }
  return undefined;
}

function normalizeMediaType(mediaType: string): string {
  return mediaType === "image/jpg" ? "image/jpeg" : mediaType;
}

function assertSupportedMediaType(mediaType: string | undefined): string {
  const normalized = mediaType ? normalizeMediaType(mediaType) : undefined;
  if (!normalized || !SUPPORTED_IMAGE_MIME.has(normalized)) {
    throw new ClipboardImageError("unsupported", "Clipboard image is not a supported type (PNG, JPEG, WebP, or GIF).");
  }
  return normalized;
}

function readImageFromPath(filePath: string): { base64: string; mediaType: string } {
  const buf = readFileSync(filePath);
  if (!buf.length) {
    throw new ClipboardImageError("empty", "Clipboard image is empty.");
  }

  const mediaType = assertSupportedMediaType(mimeTypeForImagePath(filePath) ?? detectImageMediaType(buf));
  return { base64: buf.toString("base64"), mediaType };
}

function readImageFromHtml(html: string): { base64: string; mediaType: string } | null {
  const match = html.match(/src=["']data:(image\/(?:png|jpe?g|webp|gif));base64,([^"'\s>]+)/i);
  if (!match) {
    return null;
  }

  const mediaType = assertSupportedMediaType(normalizeMediaType(match[1].toLowerCase()));
  const base64 = match[2];
  if (!base64 || !Buffer.from(base64, "base64").length) {
    return null;
  }

  return { base64, mediaType };
}

async function convertTiffToPng(tiffPath: string, pngPath: string): Promise<void> {
  await execFileAsync("/usr/bin/sips", ["-s", "format", "png", tiffPath, "--out", pngPath], {
    timeout: 15_000,
  });
}

async function exportPasteboardImageToTemp(): Promise<{ path: string; tempDir: string } | null> {
  const tempDir = mkdtempSync(join(tmpdir(), "read-my-screen-clip-"));
  const basePath = join(tempDir, "clip");

  try {
    const { stdout } = await execFileAsync("/usr/bin/osascript", ["-e", PASTEBOARD_IMAGE_SCRIPT], {
      env: { ...process.env, RMS_CLIP_BASE: basePath },
      timeout: 15_000,
    });
    const path = stdout.trim();
    if (path && existsSync(path)) {
      return { path, tempDir };
    }
  } catch {
    // Fall through to cleanup.
  }

  rmSync(tempDir, { recursive: true, force: true });
  return null;
}

async function readImageFromPasteboard(): Promise<{ base64: string; mediaType: string } | null> {
  const exported = await exportPasteboardImageToTemp();
  if (!exported) {
    return null;
  }

  const { path, tempDir } = exported;

  try {
    const ext = extname(path).toLowerCase();
    if (ext === ".tiff" || ext === ".tif") {
      const pngPath = join(tempDir, "clip.png");
      await convertTiffToPng(path, pngPath);
      return readImageFromPath(pngPath);
    }

    return readImageFromPath(path);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function fileExtensionForMediaType(mediaType: string): string {
  switch (mediaType) {
    case "image/jpeg":
      return ".jpg";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    case "image/png":
    default:
      return ".png";
  }
}

export { fileExtensionForMediaType };

/**
 * Reads an image from the clipboard: file path (Raycast API), HTML data URI, or
 * native pasteboard image data (screenshots, copied images).
 */
export async function readImageFromClipboard(): Promise<{ base64: string; mediaType: string }> {
  const { file, text, html } = await Clipboard.read();
  const trimmedFile = typeof file === "string" ? file.trim() : "";
  const textMaybePath = typeof text === "string" && text.trim().startsWith("/") ? text.trim() : "";
  const pathToTry = trimmedFile || textMaybePath;

  if (pathToTry && existsSync(pathToTry)) {
    return readImageFromPath(pathToTry);
  }

  if (typeof html === "string" && html.trim()) {
    const fromHtml = readImageFromHtml(html);
    if (fromHtml) {
      return fromHtml;
    }
  }

  const fromPasteboard = await readImageFromPasteboard();
  if (fromPasteboard) {
    return fromPasteboard;
  }

  throw new ClipboardImageError(
    "empty",
    "No image on the clipboard. Copy an image (screenshot, browser image, or image file) and try again.",
  );
}
