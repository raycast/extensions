import { Cache } from "@raycast/api";
import fs from "fs";

const imageCache = new Cache({ namespace: "ddg-images" });

export function getCachedImagePath(token: string): string | undefined {
  const path = imageCache.get(token);
  if (path && fs.existsSync(path)) {
    return path;
  }
}

export function setCachedImagePath(token: string, imagePath: string) {
  if (fs.existsSync(imagePath)) {
    imageCache.set(token, imagePath);
  }
}
