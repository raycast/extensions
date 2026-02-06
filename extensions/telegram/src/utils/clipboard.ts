import { Clipboard, environment } from "@raycast/api";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

const CLIPBOARD_DIR = path.join(environment.supportPath, "clipboard");

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
  if (!fs.existsSync(CLIPBOARD_DIR)) {
    fs.mkdirSync(CLIPBOARD_DIR, { recursive: true });
  }

  const fileBuffer = fs.readFileSync(tempPath);
  const extension = detectFileExtension(fileBuffer);

  // Create a hash of the file content to ensure same file = same path
  const hash = crypto.createHash("md5").update(fileBuffer).digest("hex");
  const properPath = path.join(CLIPBOARD_DIR, `clipboard-${hash}${extension}`);

  // Only create the file if it doesn't already exist
  if (!fs.existsSync(properPath)) {
    fs.copyFileSync(tempPath, properPath);
  }

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
