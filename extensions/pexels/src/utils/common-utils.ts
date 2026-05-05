import { environment, open, showInFinder, showToast, Toast } from "@raycast/api";
import fse from "fs-extra";
import { homedir } from "os";
import fetch from "node-fetch";
import path from "path";
import { downloadDirectory } from "../types/preferences";
import { runAppleScript } from "@raycast/utils";
import { scriptSetWallpaper } from "./applescript-utils";
import Style = Toast.Style;

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

export const getNumberIcon = (number: number) => {
  if (number < 10) {
    return `number-0${number}-16`;
  }
  return `number-${number}-16`;
};

export const getDownloadDirectory = () => {
  if (isEmpty(downloadDirectory) || !fse.pathExistsSync(downloadDirectory)) {
    return homedir() + "/Downloads";
  }
  return downloadDirectory.endsWith("/") ? downloadDirectory.substring(0, -1) : downloadDirectory;
};

// must original url
export const buildImageName = (url: string, downloadSize = "") => {
  const parsedPath = path.parse(url);
  return parsedPath.name + "-" + downloadSize + parsedPath.ext;
};

export async function downloadPhoto(url: string, name: string) {
  const toast = await showToast(Style.Animated, "Downloading...");
  const selectedPath = getDownloadDirectory();
  const filePath = selectedPath.endsWith("/") ? `${selectedPath}${name}` : `${selectedPath}/${name}`;
  const res = await fetch(url);
  const data = await res.arrayBuffer();
  fse.writeFileSync(filePath, Buffer.from(data));
  toast.title = "Success!";
  toast.message = filePath;
  toast.style = Style.Success;
  toast.primaryAction = {
    title: "Open Photo",
    onAction: () => {
      open(filePath);
    },
  };
  toast.secondaryAction = {
    title: "Show in Finder",
    onAction: () => {
      showInFinder(filePath);
    },
  };
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

const cachePath = environment.supportPath;
export const buildCachePath = (title: string) => {
  const normalizedCachePath = cachePath.endsWith("/") ? cachePath : `${cachePath}/`;
  return `${normalizedCachePath}${title}.png`;
};

async function cachePicture(title: string, url: string) {
  const actualPath = buildCachePath(title);
  if (fse.existsSync(actualPath)) {
    return actualPath;
  }
  const res = await fetch(url).catch(async (e) => {
    await showToast(Toast.Style.Failure, String(e));
  });
  if (res) {
    const buffer = await res.arrayBuffer();
    fse.writeFile(buildCachePath(title), Buffer.from(buffer), async (error: unknown) => {
      if (error != null) {
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
