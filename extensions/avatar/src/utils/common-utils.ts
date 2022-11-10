import fse from "fs-extra";
import { environment, open, showHUD, showInFinder, showToast, Toast } from "@raycast/api";
import { copyFileByPath } from "./applescript-utils";
import { homedir } from "os";
import { axiosGetImageArrayBuffer } from "./axios-utils";
import Style = Toast.Style;

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

export async function downloadAndCopyImage(url: string, extension: string) {
  const toast = await showToast(Style.Animated, "Copying...");
  const selectedPath = environment.supportPath;
  const filePath = selectedPath.endsWith("/")
    ? `${selectedPath}avatar.${extension}`
    : `${selectedPath}/avatar.${extension}`;

  fse.writeFileSync(filePath, Buffer.from(await axiosGetImageArrayBuffer(url)));
  await copyFileByPath(filePath);
  await toast.hide();
  await showHUD("Avatar copied to clipboard");
}

export async function downloadImage(url: string, extension: string, name = "") {
  const toast = await showToast(Style.Animated, "Downloading...");
  try {
    const downloadedPath = homedir() + "/Downloads/";
    const fileName = buildFileName(downloadedPath, isEmpty(name) ? "avatar" : name, extension);
    const filePath = `${downloadedPath}/${fileName}`;

    fse.writeFileSync(filePath, Buffer.from(await axiosGetImageArrayBuffer(url)));
    const options: Toast.Options = {
      style: Toast.Style.Success,
      title: "Success!",
      message: `Avatar is saved to Downloads`,
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
      toast.message = "Try with another avatar or check your internet connection.";
    }
  }
}

export function buildFileName(path: string, name: string, extension: string) {
  const directoryExists = fse.existsSync(path + name + "." + extension);
  if (!directoryExists) {
    return name + "." + extension;
  } else {
    let index = 2;
    while (directoryExists) {
      const newName = name + "-" + index + "." + extension;
      const directoryExists = fse.existsSync(path + newName);
      if (!directoryExists) {
        return newName;
      }
      index++;
    }
    return name + "-" + index + "." + extension;
  }
}

export function guid() {
  return "xxxxxxxx-xxxx-4xxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
