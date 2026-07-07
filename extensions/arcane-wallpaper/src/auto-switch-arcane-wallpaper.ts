import { cache } from "./utils/common-utils";
import { CacheKey } from "./utils/constants";
import { ArcaneWallpaper, ArcaneWallpaperWithInfo } from "./types/types";
import { captureException, closeMainWindow, environment, LaunchType, showHUD } from "@raycast/api";
import { autoSetWallpaper } from "./utils/platform-utils";
import { getAutoSwitchArcaneWallpaperPreferences } from "./types/preferences";
import { showFailureToast } from "@raycast/utils";
import { getArcaneWallpapersFromDrive } from "./wallpapers";

export default async () => {
  if (environment.launchType === LaunchType.UserInitiated) {
    await closeMainWindow();
    await showHUD("🖥️ Setting wallpaper...");
  }
  await getRandomWallpaper();
};

export const getRandomWallpaper = async () => {
  try {
    const { applyTo, refreshIntervalSeconds } = getAutoSwitchArcaneWallpaperPreferences();
    const lastRefreshTime = cache.get(CacheKey.LAST_REFRESH_TIME);
    if (
      environment.launchType === LaunchType.Background &&
      lastRefreshTime &&
      Math.floor(Date.now() / 1000) < Number(lastRefreshTime) + Number(refreshIntervalSeconds)
    ) {
      return;
    }

    const _excludeCache = cache.get(CacheKey.EXCLUDE_LIST_CACHE);
    const _excludeList = typeof _excludeCache === "undefined" ? [] : (JSON.parse(_excludeCache) as string[]);
    const cacheString = cache.get(CacheKey.WALLPAPER_LIST_CACHE);
    const cachedWallpapers = typeof cacheString === "undefined" ? [] : (JSON.parse(cacheString) as ArcaneWallpaper[]);
    let arcaneWallpapers = cachedWallpapers;

    try {
      const driveWallpapers = await getArcaneWallpapersFromDrive();
      arcaneWallpapers = driveWallpapers.length > 0 ? driveWallpapers : cachedWallpapers;
      cache.set(CacheKey.WALLPAPER_LIST_CACHE, JSON.stringify(arcaneWallpapers));
    } catch (e) {
      captureException(e);
      console.error(e);
    }

    await setRandomWallpaper(arcaneWallpapers, _excludeList, applyTo ?? "every");
  } catch (e) {
    captureException(e);
    console.error(e);
  }
};

async function setRandomWallpaper(arcaneWallpaperList: ArcaneWallpaper[], excludeList: string[], applyTo: string) {
  const includeWallpaperList = arcaneWallpaperList.filter((value) => {
    return !excludeList.includes(value.url);
  });
  const wallpaperList = includeWallpaperList.map((value) => {
    return {
      title: value.title,
      category: value.category,
      url: value.url,
      fileType: value.fileType,
      thumbnailUrl: value.thumbnailUrl,
      exclude: excludeList.includes(value.url),
    } as ArcaneWallpaperWithInfo;
  });
  if (wallpaperList.length === 0) {
    if (environment.launchType === LaunchType.UserInitiated) {
      await showFailureToast("No wallpaper found", { title: "No wallpaper found" });
    }
    return;
  }
  const randomImage = wallpaperList[Math.floor(Math.random() * wallpaperList.length)];
  await autoSetWallpaper(randomImage, applyTo);
  cache.set(CacheKey.LAST_REFRESH_TIME, `${Math.floor(Date.now() / 1000)}`);
}
