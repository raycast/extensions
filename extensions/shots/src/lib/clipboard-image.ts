import { execFile } from "node:child_process";
import { stat } from "node:fs/promises";
import { extname } from "node:path";
import { promisify } from "node:util";

import { createTempFilePath } from "./paths";

const SUPPORTED_IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".heic", ".heif", ".tif", ".tiff"]);
const execFileAsync = promisify(execFile);

export interface ClipboardReadContent {
  text: string;
  file?: string;
  html?: string;
}

export class ClipboardImageNotFoundError extends Error {
  constructor() {
    super("Copy an image file first, then run this command.");
    this.name = "ClipboardImageNotFoundError";
  }
}

export async function getReadableClipboardImageFile(content: ClipboardReadContent): Promise<string> {
  const filePath = resolveClipboardImagePath(content);

  if (!filePath || !(await isReadableImageFile(filePath))) {
    throw new ClipboardImageNotFoundError();
  }

  return filePath;
}

export async function writeClipboardImageToTempFile(): Promise<string> {
  const outputPath = await createTempFilePath("tiff");

  try {
    await execFileAsync("osascript", [
      "-e",
      "on run argv",
      "-e",
      "set outputPath to item 1 of argv",
      "-e",
      "set imageData to the clipboard as TIFF picture",
      "-e",
      "set outputFile to open for access POSIX file outputPath with write permission",
      "-e",
      "try",
      "-e",
      "set eof of outputFile to 0",
      "-e",
      "write imageData to outputFile",
      "-e",
      "close access outputFile",
      "-e",
      "on error errorMessage number errorNumber",
      "-e",
      "try",
      "-e",
      "close access outputFile",
      "-e",
      "end try",
      "-e",
      "error errorMessage number errorNumber",
      "-e",
      "end try",
      "-e",
      "end run",
      outputPath,
    ]);
  } catch {
    throw new ClipboardImageNotFoundError();
  }

  return outputPath;
}

export function resolveClipboardImagePath(content: ClipboardReadContent): string | undefined {
  if (content.file && isSupportedImagePath(content.file)) {
    return content.file;
  }

  const textPath = normalizeTextPath(content.text);
  if (textPath && isSupportedImagePath(textPath)) {
    return textPath;
  }

  return undefined;
}

export function isSupportedImagePath(filePath: string): boolean {
  return SUPPORTED_IMAGE_EXTENSIONS.has(extname(filePath).toLowerCase());
}

async function isReadableImageFile(filePath: string): Promise<boolean> {
  try {
    const stats = await stat(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
}

function normalizeTextPath(text: string): string | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;

  if (trimmed.startsWith("file://")) {
    return decodeURIComponent(new URL(trimmed).pathname);
  }

  return trimmed;
}
