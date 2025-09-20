import { showFailureToast } from "@raycast/utils";
import fs from "fs";
import path from "path";
import { promisify } from "util";

const fsAccess = promisify(fs.access);
const fsMkdir = promisify(fs.mkdir);
const fsStat = promisify(fs.stat);

export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fsAccess(dirPath, fs.constants.F_OK);
  } catch (error) {
    try {
      await fsMkdir(dirPath, { recursive: true });
    } catch (mkdirError: unknown) {
      console.error(`Error creating directory: ${dirPath}`, mkdirError);
      throw new Error(
        `Failed to create directory: ${mkdirError instanceof Error ? mkdirError.message : String(mkdirError)}`,
      );
    }
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function guessContentType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";

  const contentTypeMap: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    svg: "image/svg+xml",
    webp: "image/webp",
    txt: "text/plain",
    html: "text/html",
    css: "text/css",
    js: "application/javascript",
    json: "application/json",
    xml: "application/xml",
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    zip: "application/zip",
    rar: "application/x-rar-compressed",
    tar: "application/x-tar",
    gz: "application/gzip",
    mp3: "audio/mpeg",
    mp4: "video/mp4",
    avi: "video/x-msvideo",
    mov: "video/quicktime",
    webm: "video/webm",
  };

  return contentTypeMap[ext] || "application/octet-stream";
}

export async function validateFile(filePath: string): Promise<boolean> {
  try {
    await fsAccess(filePath, fs.constants.F_OK | fs.constants.R_OK);
    const stats = await fsStat(filePath);

    if (!stats.isFile()) {
      await showFailureToast({
        title: "Not a file",
        message: `"${filePath}" is not a file.`,
      });
      return false;
    }

    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      await showFailureToast({
        title: "File not found",
        message: `The file "${filePath}" does not exist.`,
      });
    } else {
      console.error(`Error validating file: ${filePath}`, error);
      await showFailureToast({
        title: "Error accessing file",
        message: error instanceof Error ? error.message : String(error),
      });
    }
    return false;
  }
}

export async function getFileInfo(filePath: string): Promise<{
  name: string;
  size: number;
  formattedSize: string;
  extension: string;
  contentType: string;
  lastModified: Date;
} | null> {
  try {
    const isValid = await validateFile(filePath);
    if (!isValid) return null;

    const stats = await fsStat(filePath);
    const name = path.basename(filePath);
    const extension = path.extname(filePath).slice(1).toLowerCase();

    return {
      name,
      size: stats.size,
      formattedSize: formatFileSize(stats.size),
      extension,
      contentType: guessContentType(name),
      lastModified: stats.mtime,
    };
  } catch (error) {
    console.error(`Error getting file info: ${filePath}`, error);
    return null;
  }
}

export function formatTimestamp(timestamp: string): string {
  if (!timestamp) return "Unknown";
  try {
    return new Date(timestamp).toLocaleString();
  } catch (e) {
    return timestamp;
  }
}

export function formatGeneration(generation: string): string {
  if (!generation) return "Unknown";

  return generation.length > 12
    ? `${generation.substring(0, 6)}...${generation.substring(generation.length - 6)}`
    : generation;
}

interface StorageObject {
  timeDeleted?: string;
  [key: string]: unknown;
}

export function isCurrentVersion(object: StorageObject): boolean {
  return object.timeDeleted === undefined;
}

export function calculateAge(timestamp: string): string {
  if (!timestamp) return "Unknown";

  try {
    const created = new Date(timestamp).getTime();
    const now = new Date().getTime();
    const diff = now - created;

    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return `${seconds} second${seconds !== 1 ? "s" : ""}`;

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""}`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""}`;

    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} day${days !== 1 ? "s" : ""}`;

    const months = Math.floor(days / 30);
    if (months < 12) return `${months} month${months !== 1 ? "s" : ""}`;

    const years = Math.floor(months / 12);
    return `${years} year${years !== 1 ? "s" : ""}`;
  } catch (e) {
    return "Unknown";
  }
}
