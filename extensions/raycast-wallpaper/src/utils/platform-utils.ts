import { RaycastWallpaper } from "../types/types";
import { showToast, Toast } from "@raycast/api";
import { runAppleScript, runPowerShellScript } from "@raycast/utils";
import { cachePicture } from "./common-utils";
import { applyTo } from "../types/preferences";
import { set_wallpaper as setWallpaperWindowsRust } from "rust:../../rust";

async function setWallpaperMacOS(path: string, applyTo: string) {
  const script = `
      set temp_folder to (POSIX path of ${JSON.stringify(path)})
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

export const autoSetWallpaper = async (wallpaper: RaycastWallpaper) => {
  await applyWallpaper(wallpaper, applyTo);
};

export async function applyWallpaper(wallpaper: RaycastWallpaper, monitor: string) {
  if (monitor !== "current" && monitor !== "every") {
    throw new Error("Invalid monitor. Use current or every.");
  }

  const actualPath = await cachePicture(wallpaper);
  const result = await (process.platform === "win32"
    ? setWallpaperWindows(actualPath, monitor)
    : setWallpaperMacOS(actualPath, monitor));
  if (result !== "ok") throw new Error("Error setting wallpaper.");
}

export const setWallpaper = async (wallpaper: RaycastWallpaper) => {
  const toast = await showToast(Toast.Style.Animated, "Setting wallpaper...");
  try {
    await autoSetWallpaper(wallpaper);
    toast.style = Toast.Style.Success;
    toast.title = "Wallpaper set";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not set wallpaper";
    toast.message = error instanceof Error ? error.message : String(error);
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
    if (result.trim().toLowerCase() === "true") {
      return "dark";
    }
  } catch (e) {
    console.error(e);
  }
  return "light";
};
