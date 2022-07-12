import { showToast, Toast, environment, getPreferenceValues, showHUD } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { existsSync } from "fs";

interface SetWallpaperProps {
  url: string;
  id: string;
  useHud?: boolean;
}

export const setWallpaper = async ({ url, id, useHud = false }: SetWallpaperProps) => {
  let toast;
  if (!useHud) toast = await showToast(Toast.Style.Animated, "Downloading and setting wallpaper...");

  const { downloadSize, applyTo } = getPreferenceValues<UnsplashPreferences>();
  const selectedPath = environment.supportPath;

  const fixedPathName = selectedPath.endsWith("/")
    ? `${selectedPath}${id}-${downloadSize}.jpg`
    : `${selectedPath}/${id}-${downloadSize}.jpg`;

  try {
    const actualPath = fixedPathName;

    const command = !existsSync(actualPath)
      ? `set cmd to "curl -o " & q_temp_folder & " " & "${url}"
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
    else if (useHud) {
      await showHUD("Wallpaper set!");
    } else if (toast) {
      toast.style = Toast.Style.Success;
      toast.title = "Wallpaper set!";
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

export default setWallpaper;
