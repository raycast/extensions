import { getPreferenceValues, showHUD, open } from "@raycast/api";
import { Preferences } from "./types/preferences";
import fs from "fs";

export default async function Command() {
  try {
    const preferences = getPreferenceValues<Preferences>();
    const wallpaperFolder = preferences.wallpaperFolder;

    if (!wallpaperFolder) {
      await showHUD("No wallpaper folder configured");
      return;
    }

    // Check if the folder exists
    if (!fs.existsSync(wallpaperFolder)) {
      await showHUD(`Folder not found: ${wallpaperFolder}`);
      return;
    }

    // Open the wallpaper folder in Finder using Raycast's built-in utility
    await open(wallpaperFolder);
    await showHUD("Opened wallpaper folder in Finder");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await showHUD(`Failed to open wallpaper folder: ${errorMessage}`);
  }
}
