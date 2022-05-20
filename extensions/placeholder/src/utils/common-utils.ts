import fse from "fs-extra";
import { environment, open, showHUD, showInFinder, showToast, Toast } from "@raycast/api";
import { copyFileByPath } from "./applescript-utils";
import { homedir } from "os";
import { axiosGetImageArrayBuffer } from "./axios-utils";
import Style = Toast.Style;

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

export async function downloadAndCopyImage(url: string) {
  const toast = await showToast(Style.Animated, "Downloading and Copying...");
  const selectedPath = environment.supportPath;
  const filePath = selectedPath.endsWith("/") ? `${selectedPath}Placeholder.jpg` : `${selectedPath}/Placeholder.jpg`;

  fse.writeFileSync(filePath, Buffer.from(await axiosGetImageArrayBuffer(url)));
  await copyFileByPath(filePath);
  await toast.hide();
  await showHUD("Image copied to clipboard");
}

export async function downloadImage(url: string, size: string, name = "") {
  await showToast(Style.Animated, "Downloading...");
  const selectedPath = homedir() + "/Downloads/";
  const fileName = buildFileName(selectedPath, (isEmpty(name) ? "Placeholder" : name) + "-" + size, "jpg");
  const filePath = `${selectedPath}/${fileName}`;

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
