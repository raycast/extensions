import { Toast, showToast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { existsSync } from "fs-extra";
import { applyTo } from "../types/preferences";
import type { ResendWallpaper, ResendWallpaperWithInfo } from "../types/types";
import { buildCachePath, cachePicture } from "./common-utils";

const scriptSetWallpaper = (path: string, applyTo: string) => {
  return `
      set temp_folder to (POSIX path of "${path}")
      
      set x to alias (POSIX file temp_folder)

      try
        tell application "System Events"
          tell ${applyTo} desktop
            set picture to (x as text)
            return "ok"
          end tell
        end tell
      on error
        return "error"
      end try
    `;
};

export const setWallpaper = async (wallpaper: ResendWallpaperWithInfo) => {
  const toast = await showToast(Toast.Style.Animated, "Setting wallpaper...");

  const fixedPathName = buildCachePath(wallpaper);

  try {
    const actualPath = fixedPathName;

    if (!existsSync(actualPath)) {
      await cachePicture(wallpaper);
    }

    const result = await runAppleScript(scriptSetWallpaper(actualPath, applyTo));

    if (result !== "ok") {
      throw new Error("Error setting wallpaper.");
    }

    if (toast) {
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

export const autoSetWallpaper = async (wallpaper: ResendWallpaper) => {
  const fixedPathName = buildCachePath(wallpaper);

  try {
    const actualPath = fixedPathName;

    if (!existsSync(actualPath)) {
      await cachePicture(wallpaper);
    }

    const result = await runAppleScript(scriptSetWallpaper(actualPath, applyTo));

    if (result !== "ok") throw new Error("Error setting wallpaper.");
  } catch (err) {
    console.error(err);
  }
};

const scriptSystemAppearance = `tell application "System Events" to tell appearance preferences to get dark mode`;
export const getSystemAppearance = async () => {
  try {
    const result = await runAppleScript(scriptSystemAppearance);
    if (result === "true") {
      return "dark";
    }
  } catch (e) {
    console.error(e);
  }
  return "light";
};
