import { showToast, Toast, closeMainWindow, popToRoot } from "@raycast/api";
import { setDesktopWallpaper, Wallpaper, API_RANDOM_URL } from "./utils";

export default async function Command() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Finding a new wallpaper...",
  });

  try {
    const response = await fetch(API_RANDOM_URL);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch wallpaper: ${response.status} ${response.statusText}`,
      );
    }
    const randomWallpaper = (await response.json()) as Wallpaper;

    toast.title = "Setting wallpaper...";
    await setDesktopWallpaper(randomWallpaper.url);

    toast.style = Toast.Style.Success;
    toast.title = "Wallpaper changed";
    toast.message = `${randomWallpaper.name} by ${randomWallpaper.artist}`;

    await closeMainWindow({ clearRootSearch: true });
    await popToRoot({ clearSearchBar: true });
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to set wallpaper";
    toast.message = error instanceof Error ? error.message : String(error);
    console.error("Random wallpaper error:", error);
  }
}
