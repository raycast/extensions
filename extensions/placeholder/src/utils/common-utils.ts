import fse from "fs-extra";
import { environment, getPreferenceValues, open, showHUD, showInFinder, showToast, Toast } from "@raycast/api";
import { copyFileByPath } from "./applescript-utils";
import { homedir } from "os";
import { axiosGetImageArrayBuffer } from "./axios-utils";
import Style = Toast.Style;
import { runAppleScript } from "run-applescript";
import { Preferences } from "../types/preferences";

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

export async function downloadAndCopyImage(url: string) {
  const toast = await showToast(Style.Animated, "Downloading and copying...");
  const selectedPath = environment.supportPath;
  const filePath = selectedPath.endsWith("/") ? `${selectedPath}placeholder.jpg` : `${selectedPath}/placeholder.jpg`;

  fse.writeFileSync(filePath, Buffer.from(await axiosGetImageArrayBuffer(url)));
  await copyFileByPath(filePath);
  await toast.hide();
  await showHUD("Image copied to clipboard");
}

export async function downloadImage(url: string, size: string, name = "") {
  const toast = await showToast(Style.Animated, "Downloading...");
  try {
    const downloadedPath = homedir() + "/Downloads/";
    const fileName = buildFileName(downloadedPath, (isEmpty(name) ? "placeholder" : name) + "-" + size, "jpg");
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

export const setWallpaper = async (url: string, name?: string) => {
  const toast = await showToast(Toast.Style.Animated, "Downloading and setting wallpaper...");
  try {
    const tempPath = environment.supportPath + "/Placeholder Wallpaper";
    fse.ensureDirSync(tempPath);
    const fileName = isEmpty(name) ? "Wallpaper" : name + ".jpg";
    const filePath = `${tempPath}/${fileName}`;

    await fse.writeFileSync(filePath, Buffer.from(await axiosGetImageArrayBuffer(url)));

    const { applyTo } = getPreferenceValues<Preferences>();

    const result = await runAppleScript(`
      set temp_folder to (POSIX path of "${filePath}")
      set q_temp_folder to quoted form of temp_folder
 

      set x to alias (POSIX file temp_folder)

      try
        tell application "System Events"
          tell ${applyTo} desktop
            set picture to (x as text)
            return "ok"
          end tell
        end tell
      on error
        set dialogTitle to "Error Setting Wallpaper"
        set dialogText to "Please make sure you have given Raycast the required permission. To make sure, click the button below and grant Raycast the 'System Events' permission."

        display alert dialogTitle message dialogText buttons {"Cancel", "Open Preferences"} default button 2 as informational
          if button returned of result is "Open Preferences" then
            do shell script "open 'x-apple.systempreferences:com.apple.preference.security?Privacy_Automation'"
          end if

        return "error"
      end try
    `);

    if (result !== "ok") throw new Error("Error setting wallpaper.");
    else if (toast) {
      toast.style = Toast.Style.Success;
      toast.title = "Set wallpaper successfully!";
    }
    fse.removeSync(filePath);
  } catch (err) {
    console.error(err);

    if (toast) {
      toast.style = Toast.Style.Failure;
      toast.title = "Something went wrong.";
      toast.message = "Try with another image or check your internet connection.";
    }
  }
};
