import { existsSync, readFileSync } from "fs";
import { extname } from "path";

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".bmp": "image/bmp",
  ".webp": "image/webp",
};

const PLACEHOLDER =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxIiBoZWlnaHQ9IjEiLz4=";

export function toDataUrl(filePath: string): string {
  if (!existsSync(filePath)) return PLACEHOLDER;
  try {
    const mime = MIME[extname(filePath).toLowerCase()] ?? "image/png";
    const base64 = readFileSync(filePath).toString("base64");
    return `data:${mime};base64,${base64}`;
  } catch {
    return PLACEHOLDER;
  }
}
