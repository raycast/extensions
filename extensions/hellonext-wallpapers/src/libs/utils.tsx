import { environment, getPreferenceValues, LocalStorage, showToast, Toast } from "@raycast/api";
import fs, { existsSync } from "fs";
import { runAppleScript } from "run-applescript";
import { HellonextWallpapers } from "./hn-wallpaper";
import Values = LocalStorage.Values;

export const preferences = () => {
  const preferencesMap = new Map(Object.entries(getPreferenceValues<Values>()));
  return {
    applyTo: preferencesMap.get("applyTo") as string,
    screenshotName: preferencesMap.get("screenshotName") as string,
    screenshotFormat: preferencesMap.get("screenshotFormat") as string,
  };
};
export const cachePath = environment.supportPath;

export const checkDirectoryExists = (filePath: string) => {
  try {
    fs.accessSync(filePath);
    return true;
  } catch (e) {
    return false;
  }
};

export const setWallpaper = async (wallpaper: HellonextWallpapers) => {
  const toast = await showToast(Toast.Style.Animated, "Downloading and setting wallpaper...");

  const { applyTo } = preferences();
  const fixedPathName = buildCachePath(wallpaper);

  try {
    const actualPath = fixedPathName;

    const command = !existsSync(actualPath)
      ? `set cmd to "curl -o " & q_temp_folder & " " & "${wallpaper.url}"
				do shell script cmd`
      : "";

    const result = await runAppleScript(`
			set temp_folder to (POSIX path of "${actualPath}")
			set q_temp_folder to quoted form of temp_folder

			${command}

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
      toast.title = "Set wallpaper success!";
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

export const buildCachePath = (wallpaper: HellonextWallpapers) => {
  return cachePath.endsWith("/") ? `${cachePath}${wallpaper.title}.png` : `${cachePath}/${wallpaper.title}.png`;
};

export const checkCache = (wallpaper: HellonextWallpapers) => {
  const fixedPathName = buildCachePath(wallpaper);
  return checkDirectoryExists(fixedPathName);
};

export function deleteCache() {
  const pathName = environment.supportPath;
  if (fs.existsSync(pathName)) {
    const files = fs.readdirSync(pathName);
    files.forEach(function (file) {
      const curPath = pathName + "/" + file;
      fs.unlinkSync(curPath);
    });
  }
}
