import { extname } from "node:path";

export const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".heic", ".tiff", ".tif", ".gif", ".webp", ".bmp"];

export function isImageFile(path: string): boolean {
  return IMAGE_EXTENSIONS.includes(extname(path).toLowerCase());
}

/** Screenshot file names used by macOS (current and older versions) and CleanShot. */
export function isScreenshotName(name: string): boolean {
  return isImageFile(name) && /^(Screenshot|Screen Shot|CleanShot)/i.test(name);
}
