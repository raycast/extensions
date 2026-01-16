import { LocalStorage, showHUD, environment } from "@raycast/api";
import fs from "fs";
import path from "path";
import os from "os";
import { setWallpaper, ImageFile, scanDirectory } from "./utils";

interface CycleConfig {
  folders: string[];
  mode: "sequential" | "random";
  index: number;
  favoritesOnly: boolean;
}

async function getConfig(): Promise<CycleConfig> {
  const foldersStr = await LocalStorage.getItem<string>("cycle-folders");
  const mode =
    (await LocalStorage.getItem<string>("cycle-mode")) || "sequential";
  const index = (await LocalStorage.getItem<number>("cycle-index")) || 0;
  const favoritesOnly =
    (await LocalStorage.getItem<boolean>("cycle-favorites-only")) || false;

  return {
    folders: foldersStr ? JSON.parse(foldersStr) : [],
    mode: mode as "sequential" | "random",
    index,
    favoritesOnly,
  };
}

async function saveIndex(index: number): Promise<void> {
  await LocalStorage.setItem("cycle-index", index);
}

// Optimized image retrieval using cache
async function getImagesFromCacheOrDisk(folders: string[]): Promise<string[]> {
  const picturesDir = path.join(os.homedir(), "Pictures");
  const images: string[] = [];

  // Try Cache First
  try {
    const cachedFilesStr = await LocalStorage.getItem<string>("cached-files");
    if (cachedFilesStr) {
      const cachedFiles = JSON.parse(cachedFilesStr) as ImageFile[];

      // Filter cached files to match selected folders
      const relevantFiles = cachedFiles.filter((f) => {
        // If it's a root image, check if __root__ is in selected folders
        if (f.folder === "__root__") return folders.includes("__root__");
        // Otherwise check if the folder (or parent) is in selected folders
        // Exact match or subfolder match
        return folders.some(
          (selected) =>
            f.folder === selected || f.folder.startsWith(selected + "/"),
        );
      });

      if (relevantFiles.length > 0) {
        // Double check existence (light check) or just trust cache for speed?
        // Trusting is faster, errors can be caught at setWallpaper time.
        return relevantFiles.map((f) => f.fullPath);
      }
    }
  } catch (e) {
    // Cache read failed, fall back to disk
  }

  // Fallback: Scan Disk (slow)
  // We reuse the scanDirectory util but we need to do it per folder
  // Actually, iterating folders and calling scanDirectory is expensive.
  // Let's just do what we did before but using the shared util?
  // Or just simple scan.

  // Since we want to use the EXACT same logic as Manager:
  // If no cache, we should honestly just return empty or do a quick scan.
  // But let's support robust fallback.

  for (const folder of folders) {
    if (folder === "Screenshots" || folder.endsWith("/Screenshots")) continue;
    const folderPath =
      folder === "__root__" ? picturesDir : path.join(picturesDir, folder);

    // Scan specific folder non-recursively? Or use our deep scan?
    // Use deep scan for consistency
    const res = await scanDirectory(
      folderPath,
      folder === "__root__" ? "" : folder,
    );
    res.files.forEach((f) => images.push(f.fullPath));
  }

  return images;
}

export default async function Command() {
  const launchType = environment.launchType;

  // Custom Interval Logic
  // Only check interval if launched from background
  if (launchType === "background") {
    const lastRun = (await LocalStorage.getItem<number>("cycle-last-run")) || 0;
    const interval =
      (await LocalStorage.getItem<number>("cycle-custom-interval")) || 1800000; // Default 30m
    const now = Date.now();

    if (now - lastRun < interval) {
      console.log("Skipping cycle: interval not met.");
      return;
    }

    // Update last run time
    await LocalStorage.setItem("cycle-last-run", now);
  }

  const config = await getConfig();

  // Check config validity
  if (config.folders.length === 0 && !config.favoritesOnly) {
    if (launchType === "userInitiated") {
      await showHUD("❌ No folders configured. Use 'Configure Cycle' first.");
    }
    return;
  }

  // Get images based on mode
  let images: string[];

  if (config.favoritesOnly) {
    const favoritesStr = await LocalStorage.getItem<string>("favorites");
    if (favoritesStr) {
      images = JSON.parse(favoritesStr);
      images = images.filter((imgPath) => fs.existsSync(imgPath));
    } else {
      images = [];
    }

    if (images.length === 0) {
      console.log("Favorites mode on but no favorites found.");
      if (launchType === "userInitiated") {
        await showHUD("❌ No favorites found.");
      }
      return;
    }
  } else {
    images = await getImagesFromCacheOrDisk(config.folders);
  }

  if (images.length === 0) {
    if (launchType === "userInitiated") {
      await showHUD("❌ No images found via cache or folders.");
      // Maybe trigger a cache refresh here? Too complex for bg task.
    }
    return;
  }

  // Select next image
  let nextImage: string;
  let nextIndex: number;

  if (config.mode === "random") {
    nextIndex = Math.floor(Math.random() * images.length);
    nextImage = images[nextIndex];
  } else {
    nextIndex = config.index >= images.length ? 0 : config.index;
    nextImage = images[nextIndex];
    nextIndex = (nextIndex + 1) % images.length;
  }

  // Set wallpaper
  // Note: setWallpaper in utils handles showToast, but for background we usually want silent unless error?
  // Or launchType check.
  const silent = launchType === "background";
  const success = await setWallpaper(nextImage, { silent });

  // Save new index
  await saveIndex(nextIndex);

  // Show feedback if user-initiated
  if (launchType === "userInitiated") {
    if (success) {
      const imageName = path.basename(nextImage);
      await showHUD(`✅ Wallpaper: ${imageName}`);
    } else {
      await showHUD("❌ Failed to set wallpaper");
    }
  }
}
