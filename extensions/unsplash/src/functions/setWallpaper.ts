import { showToast, ToastStyle, environment, getPreferenceValues, showHUD } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { existsSync } from "fs";

interface SetWallpaperProps {
  url: string;
  id: string;
  useHud?: boolean;
}

export const setWallpaper = async ({ url, id, useHud = false }: SetWallpaperProps) => {
  const toast = useHud && (await showToast(ToastStyle.Animated, "Downloading and setting wallpaper..."));

  const { downloadSize } = getPreferenceValues<UnsplashPreferences>();
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
          tell current desktop
            set picture to (x as text)
            return "ok"
          end tell
        end tell
      on error errormsg
        display dialog "Please make sure you have given Raycast the permission to send Automation commands to System Events. Try:\n\nSystem Preferences > Security & Privacy > Automation, find Raycast and enable System Events option." with title "Raycast: Error Setting Wallpaper"
        return "error"
      end try
    `);

    if (result !== "ok") throw new Error("Error setting wallpaper.");
    else if (useHud) {
      await showHUD("Wallpaper set!");
    } else if (toast) {
      toast.style = ToastStyle.Success;
      toast.title = "Wallpaper set!";
    }
  } catch (err) {
    console.error(err);

    if (toast) {
      toast.style = ToastStyle.Failure;
      toast.title = "Something went wrong.";
      toast.message = "Try with another image or check your internet connection.";
    }
  }
};

export default setWallpaper;
