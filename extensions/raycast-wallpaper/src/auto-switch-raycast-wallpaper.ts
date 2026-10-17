import { cache } from "./utils/common-utils";
import { CacheKey, RAYCAST_WALLPAPER_LIST_URL } from "./utils/constants";
import { RaycastWallpaper, RaycastWallpaperWithInfo } from "./types/types";
import { captureException, closeMainWindow, environment, LaunchType, showHUD } from "@raycast/api";
import axios from "axios";
import { autoSetWallpaper, getSystemAppearance } from "./utils/platform-utils";
import { refreshIntervalSeconds, respectAppearance } from "./types/preferences";
import { getAppearanceByTitle } from "./utils/appearance-utils";
import { showFailureToast } from "@raycast/utils";

export default async () => {
  if (environment.launchType === LaunchType.UserInitiated) {
    await closeMainWindow();
    await showHUD("🖥️ Setting wallpaper...");
  }
  await getRandomWallpaper();
};

export const getRandomWallpaper = async () => {
  try {
    const lastRefreshTime = cache.get(CacheKey.LAST_REFRESH_TIME);
    if (
      environment.launchType === LaunchType.Background &&
      lastRefreshTime &&
      Math.floor(Date.now() / 1000) < Number(lastRefreshTime) + Number(refreshIntervalSeconds)
    ) {
      return;
    }

    const cacheString = cache.get(CacheKey.WALLPAPER_LIST_CACHE);
    const _wallpaperList = typeof cacheString === "undefined" ? [] : (JSON.parse(cacheString) as RaycastWallpaper[]);

    const _excludeCache = cache.get(CacheKey.EXCLUDE_LIST_CACHE);
    const _excludeList = typeof _excludeCache === "undefined" ? [] : (JSON.parse(_excludeCache) as string[]);

    if (_wallpaperList.length !== 0) {
      await setRandomWallpaper(_wallpaperList, _excludeList);
    } else {
      const response = await axios.get<RaycastWallpaper[]>(RAYCAST_WALLPAPER_LIST_URL);
      await setRandomWallpaper(response.data, _excludeList);
      cache.set(CacheKey.WALLPAPER_LIST_CACHE, JSON.stringify(response.data));
    }
  } catch (e) {
    captureException(e);
    console.error(e);
    if (environment.launchType === LaunchType.UserInitiated) {
      await showFailureToast(e, { title: "Could not switch wallpaper" });
    }
  }
};

async function setRandomWallpaper(raycastWallpaperList: RaycastWallpaper[], excludeList: string[]) {
  const includeWallpaperList = raycastWallpaperList.filter((value) => {
    return !excludeList.includes(value.url);
  });
  const wallpaperList = includeWallpaperList.map((value) => {
    return {
      title: value.title,
      url: value.url,
      exclude: excludeList.includes(value.url),
      appearance: getAppearanceByTitle(value.title),
    } as RaycastWallpaperWithInfo;
  });
  let finalWallpaperList = wallpaperList;
  if (respectAppearance) {
    const systemAppearance = await getSystemAppearance();
    finalWallpaperList = wallpaperList.filter((value) => {
      return value.appearance === systemAppearance;
    });
  }
  if (finalWallpaperList.length === 0) {
    if (environment.launchType === LaunchType.UserInitiated) {
      await showFailureToast("No wallpaper found", { title: "No wallpaper found" });
    }
    return;
  }
  const randomImage = finalWallpaperList[Math.floor(Math.random() * finalWallpaperList.length)];
  await autoSetWallpaper(randomImage);
  cache.set(CacheKey.LAST_REFRESH_TIME, `${Math.floor(Date.now() / 1000)}`);
}
