import { showToast, ToastStyle, environment, getPreferenceValues } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { existsSync } from "fs";

interface SetWallpaperProps {
  url: string;
  id: string;
}

export const setWallpaper = async ({ url, id }: SetWallpaperProps) => {
  const toast = await showToast(ToastStyle.Animated, "Downloading and setting wallpaper...");

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

    await runAppleScript(`
      set temp_folder to (POSIX path of "${actualPath}")
      set q_temp_folder to quoted form of temp_folder

      ${command}

      set x to alias (POSIX file temp_folder)

      tell application "System Events"
        tell current desktop
          set picture to (x as text)
        end tell
      end tell
    `);

    toast.style = ToastStyle.Success;
    toast.title = "Wallpaper set!";
  } catch (err) {
    console.error(err);

    toast.style = ToastStyle.Failure;
    toast.title = "Something went wrong.";
    toast.message = "Try with another image or check your internet connection.";
  }
};

export default setWallpaper;
