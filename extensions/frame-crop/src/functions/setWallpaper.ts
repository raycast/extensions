import { showToast, Toast } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { getSavedDirectory, getFileExtension, formatIdForFilename } from "./utils";
import { existsSync } from "fs-extra";

interface SetWallpaperProps {
  url: string;
  id: string;
}

const scriptSetWallpaper = (path: string) => {
  return `
      set temp_folder to (POSIX path of "${path}")
      set q_temp_folder to quoted form of temp_folder

      set x to alias (POSIX file temp_folder)

      try
        tell application "System Events"
          tell every desktop
            set picture to (x as text)
            return "ok"
          end tell
        end tell
      on error
        return "error"
      end try
    `;
};

export const setWallpaper = async ({ url, id }: SetWallpaperProps) => {
  const toast = await showToast(Toast.Style.Animated, "Setting wallpaper...");
  const downloadDirectory = getSavedDirectory();
  const formattedId = formatIdForFilename(id);
  const fileExtension = getFileExtension(url) || "jpg"; // Default to jpg if no extension found
  const fixedPathName = downloadDirectory.endsWith("/")
    ? `${downloadDirectory}wallpaper-${formattedId}.${fileExtension}`
    : `${downloadDirectory}/wallpaper-${formattedId}.${fileExtension}`;

  try {
    // Check if the image exists
    if (!existsSync(fixedPathName)) {
      // Download the image if it doesn't exist
      await runAppleScript(`
        set temp_folder to (POSIX path of "${fixedPathName}")
        set q_temp_folder to quoted form of temp_folder

        do shell script "curl -o " & q_temp_folder & " " & "${url.replace(/"/g, '\\"')}"
      `);
    }

    // Set the wallpaper
    const result = await runAppleScript(scriptSetWallpaper(fixedPathName));

    if (result !== "ok") {
      throw new Error("Error setting wallpaper.");
    }

    toast.style = Toast.Style.Success;
    toast.title = "Wallpaper set!";
    toast.message = "Wallpaper has been set!";
  } catch (error) {
    console.error(error);
    toast.style = Toast.Style.Failure;
    toast.title = "Error setting wallpaper";
    toast.message = "Something went wrong. Please try again.";
  }
};
