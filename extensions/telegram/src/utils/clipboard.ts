import { Clipboard, environment } from "@raycast/api";
import * as fs from "fs";
import * as path from "path";

function detectFileExtension(buffer: Buffer): string {
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return ".jpg";
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return ".png";
  if (buffer[0] === 0x47 && buffer[1] === 0x49) return ".gif";
  if (buffer[0] === 0x52 && buffer[1] === 0x49) return ".webp";
  return ".png";
}

function parseFileUrl(fileUrl: string): string {
  let rawPath = fileUrl;
  if (rawPath.startsWith("file://")) {
    rawPath = rawPath.substring(7);
  }
  return decodeURIComponent(rawPath);
}

function isTempFile(filePath: string): boolean {
  const ext = path.extname(filePath);
  const isInTempDir = filePath.includes("/T/");
  return !ext || isInTempDir;
}

function createFileWithExtension(tempPath: string): string {
  const fileBuffer = fs.readFileSync(tempPath);
  const extension = detectFileExtension(fileBuffer);
  const properPath = path.join(environment.supportPath, `clipboard-${Date.now()}${extension}`);
  fs.copyFileSync(tempPath, properPath);
  return properPath;
}

export async function getFileFromClipboard(): Promise<string> {
  const clipboard = await Clipboard.read();

  if (!clipboard.file) {
    throw new Error("No file in clipboard");
  }

  const tempPath = parseFileUrl(clipboard.file);

  if (isTempFile(tempPath)) {
    return createFileWithExtension(tempPath);
  }

  return tempPath;
}
