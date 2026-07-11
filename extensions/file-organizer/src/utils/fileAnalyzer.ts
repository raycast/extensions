import fs from "fs";
import path from "path";
import { promisify } from "util";
import { FileInfo } from "./types";
const stat = promisify(fs.stat);

// File type mapping based on extensions
const fileTypeMap: Record<string, string> = {
  // Documents
  ".pdf": "document",
  ".doc": "document",
  ".docx": "document",
  ".txt": "document",
  ".rtf": "document",

  // Images
  ".jpg": "image",
  ".jpeg": "image",
  ".png": "image",
  ".gif": "image",
  ".svg": "image",
  ".webp": "image",

  // Audio
  ".mp3": "audio",
  ".wav": "audio",
  ".aac": "audio",
  ".flac": "audio",

  // Video
  ".mp4": "video",
  ".mov": "video",
  ".avi": "video",
  ".mkv": "video",

  // Archives
  ".zip": "archive",
  ".rar": "archive",
  ".tar": "archive",
  ".gz": "archive",

  // Code
  ".js": "code",
  ".ts": "code",
  ".py": "code",
  ".html": "code",
  ".css": "code",
  ".json": "code",
  ".md": "code",
};

export async function analyzeFile(filePath: string): Promise<FileInfo> {
  const stats = await stat(filePath);
  const parsedPath = path.parse(filePath);

  // Get file extension and determine type
  const extension = parsedPath.ext.toLowerCase();
  const type = fileTypeMap[extension] || "unknown";

  return {
    path: filePath,
    name: parsedPath.name,
    extension,
    size: stats.size,
    type,
    createdAt: stats.birthtime,
    modifiedAt: stats.mtime,
  };
}
