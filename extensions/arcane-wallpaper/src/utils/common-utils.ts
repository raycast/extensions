import { Cache, environment, open, showInFinder, showToast, Toast } from "@raycast/api";
import { existsSync, readdirSync, rmSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import { homedir } from "os";
import { ArcaneWallpaper } from "../types/types";

export const cache = new Cache();
export const cachePath = environment.supportPath;

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

export const getWallpaperPreviewUrl = (wallpaper: { url: string; thumbnailUrl?: string }) => {
  return wallpaper.thumbnailUrl ?? wallpaper.url;
};

export const getSavedDirectory = (picturesDirectory?: string): string => {
  if (!picturesDirectory || !existsSync(picturesDirectory)) {
    return homedir() + "/Downloads";
  }
  return picturesDirectory.endsWith("/") ? picturesDirectory.slice(0, -1) : picturesDirectory;
};

const getFileType = (url: string) => {
  try {
    const extension = new URL(url).pathname.split("/").pop()?.split(".").pop();
    return extension && extension !== "" && extension !== "uc" ? extension : "png";
  } catch {
    return url.split("?")[0]?.split(".").pop() || "png";
  }
};

const isRemoteUrl = (url: string) => /^https?:\/\//i.test(url);

const getSafeFileName = (title: string) => title.replace(/[/:]/g, "-");

const getImageBuffer = async (url: string) => {
  if (isRemoteUrl(url)) {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Unable to download image: ${res.status}`);
    }

    return Buffer.from(await res.arrayBuffer());
  }

  return readFile(url);
};

export async function downloadPicture(wallpaper: { title: string; url: string }, picturesDirectory?: string) {
  await showToast(Toast.Style.Animated, "Downloading...");

  const picturePath = `${getSavedDirectory(picturesDirectory)}/${getSafeFileName(wallpaper.title)}.${getFileType(wallpaper.url)}`;
  try {
    await writeFile(picturePath, await getImageBuffer(wallpaper.url));
    const options: Toast.Options = {
      style: Toast.Style.Success,
      title: "Download picture success!",
      message: `${picturePath.replace(`${homedir()}`, "~")}`,
      primaryAction: {
        title: "Open picture",
        onAction: (toast) => {
          open(picturePath);
          toast.hide();
        },
      },
      secondaryAction: {
        title: "Show in finder",
        onAction: (toast) => {
          showInFinder(picturePath);
          toast.hide();
        },
      },
    };
    await showToast(options);
  } catch (error) {
    await showToast(Toast.Style.Failure, String(error));
  }
}

export const buildCachePath = (wallpaper: ArcaneWallpaper) => {
  const fileType = getFileType(wallpaper.url);
  const normalizedCachePath = cachePath.endsWith("/") ? cachePath : `${cachePath}/`;
  return `${normalizedCachePath}${getSafeFileName(wallpaper.title)}.${fileType}`;
};

export async function cachePicture(wallpaper: ArcaneWallpaper) {
  const picturePath = buildCachePath(wallpaper);
  await writeFile(picturePath, await getImageBuffer(wallpaper.url));
}

export function deleteCache() {
  const pathName = environment.supportPath;
  if (existsSync(pathName)) {
    const files = readdirSync(pathName);
    files.forEach(function (file) {
      const curPath = pathName + "/" + file;
      rmSync(curPath, { recursive: true, force: true });
    });
  }
}
