import { Cache, environment, open, showInFinder, showToast, Toast } from "@raycast/api";
import fse from "fs-extra";
import { homedir } from "os";
import { RaycastWallpaper } from "../types/types";
import axios from "axios";
import { picturesDirectory } from "../types/preferences";

export const cache = new Cache();
export const cachePath = environment.supportPath;

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

export const getThumbnailUrl = (url: string) => {
  // TODO: Hacky way to get the thumbnail URLs for the new wallpapers, replace them for optimized thumbnails
  const fileName = url.split("wallpapers/")[1];
  if (fileName.includes("_")) {
    return url.replace(`.${getFileType(url)}`, "_preview.png");
  }

  return url.replace(`.${getFileType(url)}`, "-thumbnail.webp");
};

export const getSavedDirectory = () => {
  const actualDirectory = picturesDirectory;
  if (isEmpty(actualDirectory) || !fse.pathExistsSync(actualDirectory)) {
    return homedir() + "/Downloads";
  }
  return actualDirectory.endsWith("/") ? actualDirectory.substring(0, -1) : actualDirectory;
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

export async function downloadPicture(wallpaper: { title: string; url: string }) {
  await showToast(Toast.Style.Animated, "Downloading...");

  const picturePath = `${getSavedDirectory()}/${wallpaper.title}.${getFileType(wallpaper.url)}`;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  fse.writeFile(picturePath, Buffer.from(await axiosGetImageArrayBuffer(wallpaper.url)), async (error) => {
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
  });
}

export const buildCachePath = (raycastWallpaper: RaycastWallpaper) => {
  const fileType = getFileType(raycastWallpaper.url);
  const normalizedCachePath = cachePath.endsWith("/") ? cachePath : `${cachePath}/`;
  return `${normalizedCachePath}${raycastWallpaper.title}.${fileType}`;
};

export const checkCache = (wallpaper: RaycastWallpaper) => {
  const fixedPath = buildCachePath(wallpaper);
  return fse.pathExistsSync(fixedPath);
};

export async function cachePicture(wallpaper: RaycastWallpaper) {
  const picturePath = buildCachePath(wallpaper);
  await fse.writeFile(picturePath, Buffer.from(await axiosGetImageArrayBuffer(wallpaper.url)));
}

export function deleteCache() {
  const pathName = environment.supportPath;
  if (fse.existsSync(pathName)) {
    const files = fse.readdirSync(pathName);
    files.forEach(function (file) {
      const curPath = pathName + "/" + file;
      fse.removeSync(curPath);
    });
  }
}

export function capitalizeFirstLetter(word: string): string {
  if (!word) return "";
  return word.charAt(0).toUpperCase() + word.slice(1);
}
