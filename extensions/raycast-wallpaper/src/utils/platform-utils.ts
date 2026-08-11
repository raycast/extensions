import { RaycastWallpaper, RaycastWallpaperWithInfo } from "../types/types";
import { showToast, Toast } from "@raycast/api";
import { existsSync } from "fs-extra";
import { runAppleScript, runPowerShellScript } from "@raycast/utils";
import { buildCachePath, cachePicture } from "./common-utils";
import { applyTo } from "../types/preferences";
import { set_wallpaper as setWallpaperWindowsRust } from "rust:../../rust";

async function setWallpaperMacOS(path: string, applyTo: string) {
  const script = `
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
        return "error"
      end try
    `;

  return await runAppleScript(script);
}

async function setWallpaperWindows(path: string, applyTo: string) {
  const escapedPath = path.replace(/\//g, "\\");

  return await setWallpaperWindowsRust(escapedPath, applyTo);
}

export const setWallpaper = async (wallpaper: RaycastWallpaperWithInfo) => {
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

export const autoSetWallpaper = async (wallpaper: RaycastWallpaper) => {
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

const scriptSystemAppearanceMacOS = `tell application "System Events" to tell appearance preferences to get dark mode`;
const scriptSystemAppearanceWindows = `
$RegistryKeyPath = "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize"
$RegistryValueName = "AppsUseLightTheme"

if (-not (Test-Path $RegistryKeyPath)) {
    throw "Registry key not found: $RegistryKeyPath"
}

$value = Get-ItemPropertyValue -Path $RegistryKeyPath -Name $RegistryValueName

if ($value -isnot [int]) {
    throw "Unexpected value type for $RegistryValueName"
}

return ($value -eq 0)
`;
export const getSystemAppearance = async () => {
  try {
    const result = await (process.platform === "win32"
      ? runPowerShellScript(scriptSystemAppearanceWindows)
      : runAppleScript(scriptSystemAppearanceMacOS));
    if (result === "true") {
      return "dark";
    }
  } catch (e) {
    console.error(e);
  }
  return "light";
};
