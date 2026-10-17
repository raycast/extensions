import { ArcaneWallpaper, ArcaneWallpaperWithInfo } from "../types/types";
import { showToast, Toast } from "@raycast/api";
import { existsSync } from "fs";
import { runAppleScript } from "@raycast/utils";
import { buildCachePath, cachePicture } from "./common-utils";
import { set_wallpaper as setWallpaperWindowsRust } from "rust:../../rust";

async function setWallpaperMacOS(path: string, applyTo: string) {
  const desktopTarget = applyTo === "current" ? "desktop 1" : "every desktop";
  const script = `
      set temp_folder to (POSIX path of "${path}")
      
      set x to alias (POSIX file temp_folder)

      try
        tell application "System Events"
          tell ${desktopTarget}
            set picture to (x as text)
            return "ok"
          end tell
        end tell
      on error
        return "error"
      end try
    `;

  return await runAppleScript(script);
}

async function setWallpaperWindows(path: string, applyTo: string) {
  const escapedPath = path.replace(/\//g, "\\");

  return await setWallpaperWindowsRust(escapedPath, applyTo);
}

export const setWallpaper = async (wallpaper: ArcaneWallpaperWithInfo, applyTo: string) => {
  const toast = await showToast(Toast.Style.Animated, "Setting wallpaper...");

  const fixedPathName = buildCachePath(wallpaper);

  try {
    const actualPath = fixedPathName;

    if (!existsSync(actualPath)) {
      await cachePicture(wallpaper);
    }

    const result = await (process.platform === "win32"
      ? setWallpaperWindows(actualPath, applyTo)
      : setWallpaperMacOS(actualPath, applyTo));

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

export const autoSetWallpaper = async (wallpaper: ArcaneWallpaper, applyTo: string) => {
  const fixedPathName = buildCachePath(wallpaper);

  try {
    const actualPath = fixedPathName;

    if (!existsSync(actualPath)) {
      await cachePicture(wallpaper);
    }

    const result = await (process.platform === "win32"
      ? setWallpaperWindows(actualPath, applyTo)
      : setWallpaperMacOS(actualPath, applyTo));

    if (result !== "ok") throw new Error("Error setting wallpaper.");
  } catch (err) {
    console.error(err);
  }
};
