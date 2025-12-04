import { homedir } from "node:os";
import { Cache, Toast, environment, open, showInFinder, showToast } from "@raycast/api";
import axios from "axios";
import fse from "fs-extra";
import { picturesDirectory } from "../types/preferences";
import type { ResendWallpaper } from "../types/types";

export const cache = new Cache();
export const cachePath = environment.supportPath;

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

export const getSavedDirectory = () => {
  const actualDirectory = picturesDirectory;
  if (isEmpty(actualDirectory) || !fse.pathExistsSync(actualDirectory)) {
    return `${homedir()}/Downloads`;
  }
  return actualDirectory.endsWith("/") ? actualDirectory.slice(0, -1) : actualDirectory;
};

const getFileType = (url: string) => {
  return url.split(".").pop() || "png";
};

export const axiosGetImageArrayBuffer = async (url: string) => {
  const res = await axios({
    url: url,
    method: "GET",
    responseType: "arraybuffer",
  });
  return res.data;
};

export const getThumbnailUrl = (url: string) => {
  try {
    const urlObj = new URL(url);
    const encodedPath = encodeURIComponent(urlObj.pathname);
    return `https://resend.com/_next/image?url=${encodedPath}&w=1920&q=75`;
  } catch (error) {
    console.error(error);
    return url;
  }
};

export async function downloadPicture(wallpaper: { title: string; url: string }) {
  await showToast(Toast.Style.Animated, "Downloading...");

  const picturePath = `${getSavedDirectory()}/${wallpaper.title}.${getFileType(wallpaper.url)}`;
  fse.writeFile(
    picturePath,
    Buffer.from(await axiosGetImageArrayBuffer(wallpaper.url)),
    async (error: Error | null) => {
      if (error != null) {
        await showToast(Toast.Style.Failure, String(error));
      } else {
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
      }
    },
  );
}

export const buildCachePath = (resendWallpaper: ResendWallpaper) => {
  const fileType = getFileType(resendWallpaper.url);
  const normalizedCachePath = cachePath.endsWith("/") ? cachePath : `${cachePath}/`;
  return `${normalizedCachePath}${resendWallpaper.title}.${fileType}`;
};

export const checkCache = (wallpaper: ResendWallpaper) => {
  const fixedPath = buildCachePath(wallpaper);
  return fse.pathExistsSync(fixedPath);
};

export async function cachePicture(wallpaper: ResendWallpaper) {
  const picturePath = buildCachePath(wallpaper);
  await fse.writeFile(picturePath, Buffer.from(await axiosGetImageArrayBuffer(wallpaper.url)));
}

export function deleteCache() {
  const pathName = environment.supportPath;
  if (fse.existsSync(pathName)) {
    const files = fse.readdirSync(pathName);
    for (const file of files) {
      const curPath = `${pathName}/${file}`;
      fse.removeSync(curPath);
    }
  }
}

export function capitalizeFirstLetter(word: string): string {
  if (!word) {
    return "";
  }

  return word.charAt(0).toUpperCase() + word.slice(1);
}
