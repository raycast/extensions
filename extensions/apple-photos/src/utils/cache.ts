import { environment } from "@raycast/api";
import * as fs from "fs";
import * as path from "path";

export function idToFilename(photoId: string): string {
  return photoId.replace(/[/\\:]/g, "_");
}

export function thumbnailDir(): string {
  const dir = path.join(environment.supportPath, "thumbnails");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function originalsDir(): string {
  const dir = path.join(environment.supportPath, "originals");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function thumbnailPath(photoId: string): string {
  return path.join(thumbnailDir(), `thumb_${idToFilename(photoId)}.jpg`);
}

export function originalPath(photoId: string): string {
  return path.join(originalsDir(), `original_${idToFilename(photoId)}.jpg`);
}
