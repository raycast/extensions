import fetch from "node-fetch";
import fse from "fs-extra";
import { environment, getPreferenceValues, LocalStorage, showHUD, showToast, Toast } from "@raycast/api";
import { copyFileByPath } from "./applescript-utils";
import Style = Toast.Style;
import Values = LocalStorage.Values;
import { homedir } from "os";

export const commonPreferences = () => {
  const preferencesMap = new Map(Object.entries(getPreferenceValues<Values>()));
  return {
    primaryAction: preferencesMap.get("primaryAction") as string,
    autoRefresh: preferencesMap.get("autoRefresh") as boolean,
  };
};

export async function downloadAndCopyImage(url: string) {
  const toast = await showToast(Style.Animated, "Downloading and Copying...");
  const selectedPath = environment.supportPath;
  const filePath = selectedPath.endsWith("/") ? `${selectedPath}Placeholder.jpg` : `${selectedPath}/Placeholder.jpg`;
  const res = await fetch(url);
  const data = await res.arrayBuffer();
  fse.writeFileSync(filePath, Buffer.from(data));
  await copyFileByPath(filePath);
  await toast.hide();
  await showHUD("Image copied to clipboard");
}

export async function downloadImage(url: string) {
  const toast = await showToast(Style.Animated, "Downloading...");
  const selectedPath = homedir() + "/Downloads/";
  const fileName = buildFileName(selectedPath, "Placeholder", "jpg");
  const filePath = `${selectedPath}/${fileName}`;
  const res = await fetch(url);
  const data = await res.arrayBuffer();
  fse.writeFileSync(filePath, Buffer.from(data));
  await toast.hide();
  await showHUD("Image downloaded to Downloads");
}

export function buildFileName(path: string, name: string, extension: string) {
  const directoryExists = fse.existsSync(path + name + "." + extension);
  if (!directoryExists) {
    return name + "." + extension;
  } else {
    let index = 2;
    while (directoryExists) {
      const newName = name + " " + index + "." + extension;
      const directoryExists = fse.existsSync(path + newName);
      if (!directoryExists) {
        return newName;
      }
      index++;
    }
    return name + "-" + index + "." + extension;
  }
}
