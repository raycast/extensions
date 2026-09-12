import {
  Clipboard,
  environment,
  getPreferenceValues,
  open,
  showHUD,
  showInFinder,
  showToast,
  Toast,
} from "@raycast/api";
import { homedir } from "os";
import fse from "fs-extra";
import { axiosGetImageArrayBuffer } from "./axios-utils";
import { imgExt } from "./costants";
import path from "path";
import { copyFileByPath } from "./applescript-utils";
import { Preferences } from "../types/preferences";
import Style = Toast.Style;

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

export function isUrl(text: string): boolean {
  const regex = /^((http|https|ftp):\/\/)?((?:[\w-]+\.)+[a-z\d]+)((?:\/[^/?#]*)+)?(\?[^#]+)?(#.+)?$/i;
  return regex.test(text);
}

export const titleCase = (str: string) => {
  return str.slice(0, 1).toUpperCase() + str.slice(1).toLowerCase();
};

export function formatBytes(sizeInBytes: number) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let unitIndex = 0;
  while (sizeInBytes >= 1024) {
    sizeInBytes /= 1024;
    unitIndex++;
  }

  return `${sizeInBytes.toFixed(1)} ${units[unitIndex]}`;
}

export async function downloadAndCopyImage(url: string, name: string) {
  const toast = await showToast(Style.Animated, "Downloading and copying...");
  const cachePath = environment.supportPath + "/" + "Cache/";
  fse.ensureDirSync(cachePath);
  const parsedPath = path.parse(name);
  const fileName = buildFileName(
    cachePath + "/",
    imgExt.includes(parsedPath.ext) ? parsedPath.name : name,
    imgExt.includes(parsedPath.ext) ? parsedPath.ext : ".png",
  );
  const filePath = cachePath + fileName;
  fse.writeFileSync(filePath, Buffer.from(await axiosGetImageArrayBuffer(url)));
  await copyFileByPath(filePath);
  await toast.hide();
  await showHUD("Image copied to clipboard");
}

export async function downloadImage(url: string, name: string) {
  const toast = await showToast(Style.Animated, "Downloading...");
  try {
    const downloadedPath = homedir() + "/Downloads/";
    const parsedPath = path.parse(name);
    const fileName = buildFileName(
      downloadedPath,
      imgExt.includes(parsedPath.ext) ? parsedPath.name : name,
      imgExt.includes(parsedPath.ext) ? parsedPath.ext : ".png",
    );
    const filePath = `${downloadedPath}/${fileName}`;

    fse.writeFileSync(filePath, Buffer.from(await axiosGetImageArrayBuffer(url)));
    const options: Toast.Options = {
      style: Toast.Style.Success,
      title: "Success!",
      message: `Image is saved to Downloads`,
      primaryAction: {
        title: "Open image",
        onAction: (toast) => {
          open(filePath);
          toast.hide();
        },
      },
      secondaryAction: {
        title: "Show in finder",
        onAction: (toast) => {
          showInFinder(filePath);
          toast.hide();
        },
      },
    };
    await showToast(options);
  } catch (err) {
    console.error(err);

    if (toast) {
      toast.style = Toast.Style.Failure;
      toast.title = "Something went wrong.";
      toast.message = "Try with another image or check your internet connection.";
    }
  }
}

export function buildFileName(path: string, name: string, extension: string) {
  const directoryExists = fse.existsSync(path + name + "." + extension);
  if (!directoryExists) {
    return name + extension;
  } else {
    let index = 2;
    while (directoryExists) {
      const newName = name + "-" + index + extension;
      const directoryExists = fse.existsSync(path + newName);
      if (!directoryExists) {
        return newName;
      }
      index++;
    }
    return name + "-" + index + extension;
  }
}

export async function copyLinkWithForm(link: string) {
  const { linkForm } = getPreferenceValues<Preferences>();
  let finalLink = link;
  if (linkForm == "markdown") {
    finalLink = `![](${link})`;
  }
  await Clipboard.copy(finalLink);
}
