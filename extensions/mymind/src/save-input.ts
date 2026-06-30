import { existsSync, statSync } from "fs";
import { basename, extname } from "path";

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
  return UPLOAD_MIME_TYPES[extname(filePath).toLowerCase()];
}

export function isUploadCandidate(filePath: string): boolean {
  if (!filePath || !existsSync(filePath)) {
    return false;
  }

  try {
    return statSync(filePath).isFile() && Boolean(getUploadMimeType(filePath));
  } catch {
    return false;
  }
}

export function classifyFilePaths(filePaths: string[]): SaveInput {
  const supportedFiles = Array.from(new Set(filePaths.filter(isUploadCandidate)));
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
