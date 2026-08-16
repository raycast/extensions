import fs from "fs";
import path from "path";
import { DetectedFileInfo, FileCategory } from "./types";

const VIDEO_EXTS = new Set([
  ".mp4",
  ".mov",
  ".mkv",
  ".webm",
  ".avi",
  ".flv",
  ".wmv",
  ".m4v",
  ".3gp",
  ".ts",
  ".mpeg",
  ".mpg",
]);

const IMAGE_EXTS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".avif",
  ".tiff",
  ".tif",
  ".gif",
  ".bmp",
  ".heic",
  ".heif",
  ".svg",
]);

const AUDIO_EXTS = new Set([
  ".mp3",
  ".wav",
  ".m4a",
  ".aac",
  ".ogg",
  ".flac",
  ".opus",
  ".wma",
  ".aiff",
]);

const PDF_EXTS = new Set([".pdf"]);

const ARCHIVE_EXTS = new Set([
  ".zip",
  ".rar",
  ".7z",
  ".tar",
  ".gz",
  ".bz2",
  ".xz",
  ".zst",
  ".iso",
]);

export function detectFileCategory(filePath: string): FileCategory {
  const ext = path.extname(filePath).toLowerCase();
  if (VIDEO_EXTS.has(ext)) return "video";
  if (IMAGE_EXTS.has(ext)) return "image";
  if (AUDIO_EXTS.has(ext)) return "audio";
  if (PDF_EXTS.has(ext)) return "pdf";
  if (ARCHIVE_EXTS.has(ext)) return "archive";
  return "unknown";
}

export function getDetectedFileInfo(filePath: string): DetectedFileInfo | null {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) {
      return null;
    }
    const ext = path.extname(filePath).toLowerCase();
    const name = path.basename(filePath);
    const category = detectFileCategory(filePath);

    return {
      path: filePath,
      name,
      extension: ext,
      sizeBytes: stat.size,
      category,
    };
  } catch {
    return null;
  }
}
