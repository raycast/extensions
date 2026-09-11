import { getPreferenceValues, showHUD, showToast, Toast } from "@raycast/api";
import { searchWallpapers } from "./api";
import {
  downloadImage,
  getFileExtension,
  getTempFilePath,
  setDesktopWallpaper,
} from "./utils";

export default async function RandomWallpaper() {
  const { sfwOnly } = getPreferenceValues<Preferences>();
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Fetching random wallpaper...",
  });

  try {
    const result = await searchWallpapers({
      sorting: "random",
      purity: sfwOnly ? "100" : undefined,
    });
    if (!result.data.length) {
      toast.style = Toast.Style.Failure;
      toast.title = "No wallpapers found";
      return;
    }

    const wallpaper = result.data[0];
    toast.title = "Downloading wallpaper...";

    const ext = getFileExtension(wallpaper.path);
    const tempPath = getTempFilePath(`wallhaven-${wallpaper.id}.${ext}`);
    await downloadImage(wallpaper.path, tempPath);

    toast.title = "Setting wallpaper...";
    await setDesktopWallpaper(tempPath);

    toast.hide();
    await showHUD(`Wallpaper set! (${wallpaper.resolution})`);
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to set wallpaper";
    toast.message = error instanceof Error ? error.message : "Unknown error";
  }
}
