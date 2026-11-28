import { Cache, environment, open, showInFinder, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import fse from "fs-extra";
import { homedir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { RaycastWallpaper } from "../types/types";
import axios from "axios";
import { picturesDirectory } from "../types/preferences";
import { getCacheFilename, getPictureFilename, preparePicture, resolvePicturesDirectory } from "./wallpaper-file";

export const cache = new Cache();
// Keep complete, platform-compatible images separate from the old cache and other support files.
export const cachePath = path.join(environment.supportPath, "pictures-v2");

export const getThumbnailUrl = (url: string) => {
  const thumbnail = new URL(url);
  const extension = path.extname(thumbnail.pathname);
  const filename = path.basename(thumbnail.pathname);
  thumbnail.pathname =
    thumbnail.pathname.slice(0, -extension.length) + (filename.includes("_") ? "_preview.png" : "-thumbnail.webp");
  return thumbnail.toString();
};

export const getSavedDirectory = () => resolvePicturesDirectory(picturesDirectory);

export async function openWallpaperFolder() {
  try {
    const directory = getSavedDirectory();
    await fse.ensureDir(directory);
    await open(directory);
  } catch (error) {
    await showFailureToast(error, { title: "Could not open wallpaper folder" });
  }
}

async function fetchPicture(wallpaper: RaycastWallpaper) {
  const response = await axios.get<ArrayBuffer>(wallpaper.url, { responseType: "arraybuffer", timeout: 60_000 });
  const buffer = Buffer.from(response.data);
  if (buffer.length === 0) throw new Error("The downloaded wallpaper is empty.");
  return preparePicture(buffer, wallpaper.url);
}

async function writePicture(picturePath: string, buffer: Buffer) {
  await fse.ensureDir(path.dirname(picturePath));
  const temporaryPath = `${picturePath}.${randomUUID()}.tmp`;
  try {
    await fse.writeFile(temporaryPath, buffer);
    await fse.rename(temporaryPath, picturePath);
  } finally {
    await fse.remove(temporaryPath);
  }
}

export async function downloadPicture(wallpaper: RaycastWallpaper) {
  const toast = await showToast(Toast.Style.Animated, "Downloading...");
  try {
    const picturePath = path.join(getSavedDirectory(), getPictureFilename(wallpaper));
    const cachedPath = await cachePicture(wallpaper);
    await writePicture(picturePath, await fse.readFile(cachedPath));
    toast.style = Toast.Style.Success;
    toast.title = "Wallpaper downloaded";
    toast.message = picturePath.replace(homedir(), "~");
    toast.primaryAction = {
      title: "Open Picture",
      onAction: async () => {
        await open(picturePath);
        await toast.hide();
      },
    };
    toast.secondaryAction = {
      title: process.platform === "win32" ? "Show in File Explorer" : "Show in Finder",
      onAction: async () => {
        await showInFinder(picturePath);
        await toast.hide();
      },
    };
  } catch (error) {
    await showFailureToast(error, { title: "Could not download wallpaper" });
  }
}

export const buildCachePath = (wallpaper: RaycastWallpaper) => path.join(cachePath, getCacheFilename(wallpaper));

const pendingPictures = new Map<string, Promise<string>>();

export async function cachePicture(wallpaper: RaycastWallpaper): Promise<string> {
  const picturePath = buildCachePath(wallpaper);
  const pending = pendingPictures.get(picturePath);
  if (pending) return pending;

  const download = (async () => {
    if (await fse.pathExists(picturePath)) {
      const stat = await fse.stat(picturePath);
      if (stat.isFile() && stat.size > 0) return picturePath;
    }
    await writePicture(picturePath, await fetchPicture(wallpaper));
    return picturePath;
  })();
  pendingPictures.set(picturePath, download);
  try {
    return await download;
  } finally {
    pendingPictures.delete(picturePath);
  }
}

export async function deleteCache() {
  await Promise.allSettled(pendingPictures.values());
  await fse.remove(cachePath);
}

export function capitalizeFirstLetter(word: string): string {
  if (!word) return "";
  return word.charAt(0).toUpperCase() + word.slice(1);
}
