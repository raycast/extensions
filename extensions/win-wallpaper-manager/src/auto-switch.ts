import { Cache, getPreferenceValues, showHUD, environment } from "@raycast/api";
import fs from "fs/promises";
import path from "path";
import { setWindowsWallpaper } from "./utils";

interface WallpaperItem {
  id: string;
  urlOrPath: string;
  source: string;
}

export default async function Command() {
  const cache = new Cache();

  // Anti-spam lock
  const lock = cache.get("auto-switch-lock");
  if (lock && Date.now() - parseInt(lock) < 10000) {
    if (!environment.isLaunchFromBackground)
      await showHUD("Please wait a moment...");
    return;
  }

  cache.set("auto-switch-lock", Date.now().toString());

  try {
    if (!environment.isLaunchFromBackground) {
      await showHUD("Selecting wallpaper...");
    }

    // Check if auto-switch is enabled
    const autoSwitchStr = cache.get("auto-switch-config");
    if (!autoSwitchStr) {
      if (!environment.isLaunchFromBackground)
        await showHUD("Auto Switch is Disabled");
      return;
    }

    const config = JSON.parse(autoSwitchStr) as {
      enabled: boolean;
      source: "local" | "favorites";
    };
    if (!config.enabled) {
      if (!environment.isLaunchFromBackground)
        await showHUD("Auto Switch is Disabled");
      return;
    }

    const excludedStr = cache.get("excluded-wallpapers");
    const excluded = excludedStr ? (JSON.parse(excludedStr) as string[]) : [];

    let candidates: WallpaperItem[] = [];

    if (config.source === "favorites") {
      const favStr = cache.get("favorite-wallpapers");
      if (favStr) {
        candidates = JSON.parse(favStr);
      }
    } else if (config.source === "local") {
      const preferences = getPreferenceValues();
      const localPath = preferences.localFolderPath as string;
      if (localPath) {
        try {
          const files = await fs.readdir(localPath);
          const imageFiles = files.filter((f) =>
            /\.(jpg|jpeg|png|webp)$/i.test(f),
          );
          candidates = imageFiles.map((file) => {
            const fullPath = path.join(localPath, file);
            return {
              id: fullPath,
              urlOrPath: fullPath,
              source: "local",
            };
          });
        } catch {
          // Silently ignore directory errors in background
        }
      }
    }

    const lastWallpaperId = cache.get("last-wallpaper-id");

    // Filter out excluded wallpapers
    const validCandidates = candidates.filter((c) => !excluded.includes(c.id));

    // Filter out the last one unless it's the only option left
    const available = validCandidates.filter((c) => c.id !== lastWallpaperId);
    const finalCandidates = available.length > 0 ? available : validCandidates;

    if (finalCandidates.length > 0) {
      const randomItem =
        finalCandidates[Math.floor(Math.random() * finalCandidates.length)];
      await setWindowsWallpaper(randomItem.urlOrPath);
      cache.set("last-wallpaper-id", randomItem.id);
    } else {
      if (!environment.isLaunchFromBackground)
        await showHUD("No valid wallpapers found to switch to");
    }
  } catch {
    if (!environment.isLaunchFromBackground)
      await showHUD("Failed to switch wallpaper");
  } finally {
    cache.remove("auto-switch-lock");
  }
}
