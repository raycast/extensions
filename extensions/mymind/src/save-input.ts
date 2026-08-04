import { closeSync, existsSync, openSync, readSync, statSync } from "fs";
import { basename, extname } from "path";
import { fileURLToPath } from "url";

type ClipboardLike = {
  text?: string;
  html?: string;
  file?: string;
};

export type SaveInput =
  | { kind: "empty" }
  | { kind: "url"; value: string }
  | { kind: "note"; value: string }
  | { kind: "files"; value: string[] };

const UPLOAD_MIME_TYPES: Record<string, string> = {
  ".avi": "video/x-msvideo",
  ".avif": "image/avif",
  ".bmp": "image/bmp",
  ".gif": "image/gif",
  ".heic": "image/heif",
  ".heif": "image/heif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".jxl": "image/jxl",
  ".mkv": "video/x-matroska",
  ".md": "text/markdown",
  ".mov": "video/quicktime",
  ".mp4": "video/mp4",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".psd": "image/vnd.adobe.photoshop",
  ".svg": "image/svg+xml",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
  ".webm": "video/webm",
  ".webp": "image/webp",
};

function normalizeText(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeFilePath(value: string): string {
  const trimmed = value.trim();

  if (!trimmed.startsWith("file:")) {
    return trimmed;
  }

  try {
    return fileURLToPath(trimmed);
  } catch {
    return trimmed;
  }
}

function readFileHeader(filePath: string): Buffer | undefined {
  let fileDescriptor: number | undefined;

  try {
    fileDescriptor = openSync(filePath, "r");
    const header = Buffer.alloc(16);
    const bytesRead = readSync(fileDescriptor, header, 0, header.length, 0);
    return header.subarray(0, bytesRead);
  } catch {
    return undefined;
  } finally {
    if (fileDescriptor !== undefined) {
      closeSync(fileDescriptor);
    }
  }
}

function detectUploadMimeType(filePath: string): string | undefined {
  const header = readFileHeader(filePath);

  if (!header) {
    return undefined;
  }

  const ascii = header.toString("ascii");
  const hex = header.toString("hex");

  if (hex.startsWith("89504e470d0a1a0a")) return "image/png";
  if (hex.startsWith("ffd8ff")) return "image/jpeg";
  if (ascii.startsWith("GIF87a") || ascii.startsWith("GIF89a")) return "image/gif";
  if (ascii.startsWith("BM")) return "image/bmp";
  if (hex.startsWith("49492a00") || hex.startsWith("4d4d002a")) return "image/tiff";
  if (ascii.startsWith("8BPS")) return "image/vnd.adobe.photoshop";
  if (ascii.startsWith("%PDF")) return "application/pdf";
  if (ascii.startsWith("RIFF") && ascii.slice(8, 12) === "WEBP") return "image/webp";
  if (ascii.startsWith("RIFF") && ascii.slice(8, 12) === "AVI ") return "video/x-msvideo";
  if (hex.startsWith("1a45dfa3")) return "video/webm";

  if (ascii.slice(4, 8) === "ftyp") {
    const brand = ascii.slice(8, 12);
    if (brand === "avif" || brand === "avis") return "image/avif";
    if (["heic", "heix", "hevc", "hevx", "mif1", "msf1"].includes(brand)) return "image/heif";
    if (brand === "qt  ") return "video/quicktime";
    return "video/mp4";
  }

  return undefined;
}

export function isProbablyUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function classifyTextInput(value?: string): SaveInput {
  const normalized = normalizeText(value);

  if (!normalized) {
    return { kind: "empty" };
  }

  return isProbablyUrl(normalized) ? { kind: "url", value: normalized } : { kind: "note", value: normalized };
}

export function extractClipboardText(content: ClipboardLike): string | undefined {
  return normalizeText(content.text) ?? normalizeText(content.html);
}

export function classifyClipboardContent(content: ClipboardLike): SaveInput {
  const fileInput = classifyFilePaths(content.file ? [content.file] : []);
  if (fileInput.kind === "files") {
    return fileInput;
  }

  return classifyTextInput(extractClipboardText(content));
}

export function getUploadMimeType(filePath: string): string | undefined {
  const normalizedPath = normalizeFilePath(filePath);
  return UPLOAD_MIME_TYPES[extname(normalizedPath).toLowerCase()] ?? detectUploadMimeType(normalizedPath);
}

export function isUploadCandidate(filePath: string): boolean {
  const normalizedPath = normalizeFilePath(filePath);

  if (!normalizedPath || !existsSync(normalizedPath)) {
    return false;
  }

  try {
    return statSync(normalizedPath).isFile() && Boolean(getUploadMimeType(normalizedPath));
  } catch {
    return false;
  }
}

export function classifyFilePaths(filePaths: string[]): SaveInput {
  const supportedFiles = Array.from(new Set(filePaths.map(normalizeFilePath).filter(isUploadCandidate)));
  return supportedFiles.length > 0 ? { kind: "files", value: supportedFiles } : { kind: "empty" };
}

export function getUploadDisplayName(filePath: string): string {
  return basename(filePath);
}

export function getUploadBaseTitle(filePath: string): string {
  return basename(filePath, extname(filePath)).trim();
}

export function getUnsupportedUploadFiles(filePaths: string[]): string[] {
  return Array.from(new Set(filePaths.filter(Boolean))).filter((filePath) => !isUploadCandidate(filePath));
}
