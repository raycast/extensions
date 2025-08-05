import { getPreferenceValues, showHUD } from "@raycast/api";
import { Preferences } from "./types/preferences";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";

const execPromise = promisify(exec);

export default async function Command() {
  try {
    console.log("Getting preferences...");
    const preferences = getPreferenceValues<Preferences>();
    console.log("All preferences:", preferences);

    const wallpaperFolder = preferences.wallpaperFolder;
    console.log("Wallpaper folder path:", wallpaperFolder);

    if (!wallpaperFolder) {
      await showHUD("❌ No wallpaper folder configured");
      return;
    }

    // Check if the folder exists
    if (!fs.existsSync(wallpaperFolder)) {
      await showHUD(`❌ Folder not found: ${wallpaperFolder}`);
      return;
    }

    // Open the wallpaper folder in Finder
    console.log("Opening folder:", wallpaperFolder);
    await execPromise(`open "${wallpaperFolder}"`);
    await showHUD("✅ Opened wallpaper folder in Finder");
  } catch (error) {
    console.error("Error opening wallpaper folder:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await showHUD(`❌ Failed to open wallpaper folder: ${errorMessage}`);
  }
}
