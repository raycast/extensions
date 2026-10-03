import { createHash } from "node:crypto";
import { homedir } from "node:os";
import path from "node:path";
import convert from "heic-convert";
import { RaycastWallpaper } from "../types/types";

export function needsConversion(url: string, platform = process.platform) {
  return platform === "win32" && [".heic", ".heif"].includes(path.extname(new URL(url).pathname).toLowerCase());
}

export function getPictureFilename(wallpaper: RaycastWallpaper, platform = process.platform) {
  const title = Array.from(wallpaper.title, (character) =>
    character.charCodeAt(0) < 32 || '<>:"/\\|?*'.includes(character) ? "_" : character,
  )
    .join("")
    .replace(/[. ]+$/, "");
  const extension = needsConversion(wallpaper.url, platform)
    ? ".jpg"
    : path.extname(new URL(wallpaper.url).pathname).toLowerCase() || ".png";
  return `${title || "Wallpaper"}${extension}`;
}

export function getCacheFilename(wallpaper: RaycastWallpaper) {
  const hash = createHash("sha256").update(wallpaper.url).digest("hex").slice(0, 12);
  return `${hash}-${getPictureFilename(wallpaper)}`;
}

export function resolvePicturesDirectory(directory: string | undefined) {
  if (!directory?.trim()) return path.join(homedir(), "Downloads");
  if (directory === "~") return homedir();
  if (directory.startsWith("~/") || directory.startsWith("~\\")) return path.join(homedir(), directory.slice(2));
  return directory;
}

export async function preparePicture(buffer: Buffer, url: string, platform = process.platform) {
  if (!needsConversion(url, platform)) return buffer;
  return Buffer.from(await convert({ buffer, format: "JPEG", quality: 1 }));
}
