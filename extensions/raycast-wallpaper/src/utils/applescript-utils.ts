import { RaycastWallpaper, RaycastWallpaperWithInfo } from "../types/types";
import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { Preferences } from "../types/preferences";
import { existsSync } from "fs-extra";
import { runAppleScript } from "@raycast/utils";
import { buildCachePath, cachePicture } from "./common-utils";

const scriptSetWallpaper = (path: string, applyTo: string) => {
  return `
      set temp_folder to (POSIX path of "${path}")
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
    `;
};

export const setWallpaper = async (wallpaper: RaycastWallpaperWithInfo) => {
  const toast = await showToast(Toast.Style.Animated, "Setting wallpaper...");

  const { applyTo } = getPreferenceValues<Preferences>();
  const fixedPathName = buildCachePath(wallpaper);

  try {
    const actualPath = fixedPathName;

    if (!existsSync(actualPath)) {
      await cachePicture(wallpaper);
    }

    const result = await runAppleScript(scriptSetWallpaper(actualPath, applyTo));

    if (result !== "ok") throw new Error("Error setting wallpaper.");
    else if (toast) {
      toast.style = Toast.Style.Success;
      toast.title = "Set wallpaper successfully!";
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

export const autoSetWallpaper = async (wallpaper: RaycastWallpaper) => {
  const { applyTo } = getPreferenceValues<Preferences>();
  const fixedPathName = buildCachePath(wallpaper);

  try {
    const actualPath = fixedPathName;
    console.log("actualPath", actualPath);

    if (!existsSync(actualPath)) {
      await cachePicture(wallpaper);
    }

    const result = await runAppleScript(scriptSetWallpaper(actualPath, applyTo));

    if (result !== "ok") throw new Error("Error setting wallpaper.");
  } catch (err) {
    console.error(err);
  }
};
