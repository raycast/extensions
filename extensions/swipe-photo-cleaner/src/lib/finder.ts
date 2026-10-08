import { getSelectedFinderItems, showToast, Toast } from "@raycast/api";
import { stat } from "node:fs/promises";
import path from "node:path";
import { IMAGE_EXTENSIONS } from "./formats";
import { PhotoItem } from "../types";

export async function getFinderPhotos(): Promise<PhotoItem[]> {
  try {
    const items = await getSelectedFinderItems();
    const photos: PhotoItem[] = [];

    for (const item of items) {
      const ext = path.extname(item.path).toLowerCase();
      if (!IMAGE_EXTENSIONS.has(ext)) continue;

      const fileStat = await stat(item.path);
      if (!fileStat.isFile()) continue;

      photos.push({
        path: item.path,
        name: path.basename(item.path),
        size: fileStat.size,
        modifiedAt: fileStat.mtime,
        createdAt: fileStat.birthtime,
      });
    }

    photos.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    return photos;
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not get Finder selection",
      message: "Make sure Finder is active with files selected",
    });
    return [];
  }
}
