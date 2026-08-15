import { environment, open, showInFinder, showToast, Toast } from "@raycast/api";
import fse, { existsSync } from "fs-extra";
import { runAppleScript } from "run-applescript";
import { homedir } from "os";
import { downloadDirectory } from "../types/preferences";
import { BingImage, DownloadedBingImage } from "../types/types";
import fetch from "node-fetch";
import { buildBingImageURL, getPictureName } from "./bing-wallpaper-utils";
import { wallpaperImageExtension } from "./constants";
import { parse } from "path";
import { scriptSetWallpaper } from "./script-utils";

export const cachePath = environment.supportPath;

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

export const buildCachePath = (title: string) => {
  const normalizedCachePath = cachePath.endsWith("/") ? cachePath : `${cachePath}/`;
  return `${normalizedCachePath}${title}.png`;
};

async function cachePicture(title: string, url: string) {
  const actualPath = buildCachePath(title);
  if (existsSync(actualPath)) {
    return actualPath;
  }
  const res = await fetch(url).catch(async (e) => {
    await showToast(Toast.Style.Failure, String(e));
  });
  if (res) {
    const buffer = await res.arrayBuffer();
    fse.writeFile(buildCachePath(title), Buffer.from(buffer), async (error: NodeJS.ErrnoException | null) => {
      if (error) {
        await showToast(Toast.Style.Failure, String(error));
      }
    });
  }
  return actualPath;
}

export const setOnlineWallpaper = async (title: string, url: string, isShowToast: boolean = true) => {
  const toast = isShowToast ? await showToast(Toast.Style.Animated, "Downloading wallpaper...") : undefined;
  await fse.emptydir(cachePath);
  try {
    const actualPath = await cachePicture(title, url);
    if (toast) {
      toast.title = "Setting wallpaper...";
    }
    const result = await runAppleScript(scriptSetWallpaper(actualPath));
    if (result !== "ok") {
      if (isShowToast && toast) {
        toast.style = Toast.Style.Failure;
        toast.title = result;
      }
    } else {
      if (toast) {
        toast.style = Toast.Style.Success;
        toast.title = "Set wallpaper successfully!";
      }
    }
  } catch (err) {
    console.error(err);
    if (toast) {
      toast.style = Toast.Style.Failure;
      toast.title = "Something went wrong.";
      toast.message = "Try with another image or check your internet connection.";
    }
  }
};

export const setLocalWallpaper = async (path: string, isShowToast: boolean = true) => {
  const toast = isShowToast ? await showToast(Toast.Style.Animated, "Setting wallpaper...") : undefined;
  try {
    const result = await runAppleScript(scriptSetWallpaper(path));

    if (result !== "ok") {
      if (isShowToast && toast) {
        toast.style = Toast.Style.Failure;
        toast.title = result;
      }
    } else {
      if (toast) {
        toast.style = Toast.Style.Success;
        toast.title = "Set wallpaper successfully!";
      }
    }
  } catch (err) {
    console.error(err);

    if (toast) {
      toast.style = Toast.Style.Failure;
      toast.title = "Something went wrong.";
      toast.message = "Try with another image.";
    }
  }
};

export const getPicturesDirectory = () => {
  let actualDirectory = downloadDirectory;
  if (downloadDirectory.startsWith("~")) {
    actualDirectory = downloadDirectory.replace("~", `${homedir()}`);
  }
  if (isEmpty(actualDirectory) || !fse.pathExistsSync(actualDirectory)) {
    return homedir() + "/Downloads";
  }
  return actualDirectory.endsWith("/") ? actualDirectory.substring(0, -1) : actualDirectory;
};

export async function downloadPicture(downSize: string, bingImage: BingImage) {
  await showToast(Toast.Style.Animated, "Downloading...");
  fetch(buildBingImageURL(bingImage.url, downSize))
    .then(function (res) {
      return res.arrayBuffer();
    })
    .then(function (buffer) {
      const picturePath = `${getPicturesDirectory()}/${getPictureName(bingImage.url)}-${bingImage.startdate}.png`;
      fse.writeFile(picturePath, Buffer.from(buffer), async (error: NodeJS.ErrnoException | null) => {
        if (error) {
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
    });
}

export async function autoDownloadPictures(downSize: string, bingImages: BingImage[]) {
  bingImages.forEach((value) => {
    const picturePath = `${getPicturesDirectory()}/${getPictureName(value.url)}-${value.startdate}.png`;
    if (!fse.existsSync(picturePath)) {
      fetch(buildBingImageURL(value.url, downSize))
        .then(function (res) {
          return res.arrayBuffer();
        })
        .then(function (buffer) {
          fse.writeFile(picturePath, Buffer.from(buffer), async (error: NodeJS.ErrnoException | null) => {
            if (error) {
              console.error(String(error));
            }
          });
        });
    }
  });
}

export function getDownloadedBingWallpapers() {
  const downloadedWallpapers: DownloadedBingImage[] = [];
  try {
    const imageFolderPath = getPicturesDirectory();
    const files = fse.readdirSync(imageFolderPath);
    files.forEach((value) => {
      if (wallpaperImageExtension.includes(parse(value).ext) && !value.startsWith(".")) {
        downloadedWallpapers.push({ name: parse(value).name, path: imageFolderPath + "/" + value });
      }
    });
    return downloadedWallpapers;
  } catch (e) {
    console.error(e);
    return downloadedWallpapers;
  }
}
