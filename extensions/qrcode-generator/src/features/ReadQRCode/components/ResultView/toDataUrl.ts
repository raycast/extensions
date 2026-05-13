import { readFileSync } from "fs";
import { extname } from "path";

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".bmp": "image/bmp",
  ".webp": "image/webp",
};

export function toDataUrl(filePath: string): string {
  const mime = MIME[extname(filePath).toLowerCase()] ?? "image/png";
  const base64 = readFileSync(filePath).toString("base64");
  return `data:${mime};base64,${base64}`;
}
