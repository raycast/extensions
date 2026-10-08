import { LaunchType, captureException, closeMainWindow, environment, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import axios from "axios";
import { refreshIntervalSeconds, respectAppearance } from "./types/preferences";
import type { ResendWallpaper, ResendWallpaperWithInfo } from "./types/types";
import { getAppearanceByTitle } from "./utils/appearance-utils";
import { autoSetWallpaper, getSystemAppearance } from "./utils/applescript-utils";
import { cache } from "./utils/common-utils";
import { CacheKey, RESEND_WALLPAPER_LIST_URL } from "./utils/constants";

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
    const _wallpaperList = typeof cacheString === "undefined" ? [] : (JSON.parse(cacheString) as ResendWallpaper[]);

    const _excludeCache = cache.get(CacheKey.EXCLUDE_LIST_CACHE);
    const _excludeList = typeof _excludeCache === "undefined" ? [] : (JSON.parse(_excludeCache) as string[]);

    if (_wallpaperList.length !== 0) {
      await setRandomWallpaper(_wallpaperList, _excludeList);
    } else {
      await axios({
        method: "GET",
        url: RESEND_WALLPAPER_LIST_URL,
        params: {
          format: "json",
        },
      })
        .then(async (axiosRes) => {
          const _resendWallpaper = axiosRes.data as ResendWallpaper[];
          await setRandomWallpaper(_resendWallpaper, _excludeList);
          cache.set(CacheKey.WALLPAPER_LIST_CACHE, JSON.stringify(_resendWallpaper));
        })
        .catch((error) => {
          captureException(error);
          console.error(error);
          showFailureToast(error, { title: "Failed to fetch wallpapers" });
        });
    }
  } catch (e) {
    captureException(e);
    console.error(e);
  }
};

async function setRandomWallpaper(resendWallpaperList: ResendWallpaper[], excludeList: string[]) {
  const includeWallpaperList = resendWallpaperList.filter((value) => {
    return !excludeList.includes(value.url);
  });
  const wallpaperList = includeWallpaperList.map((value) => {
    return {
      title: value.title,
      url: value.url,
      exclude: excludeList.includes(value.url),
      appearance: getAppearanceByTitle(value.title),
    } as ResendWallpaperWithInfo;
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
      await showFailureToast("No wallpaper found", {
        title: "No wallpaper found",
      });
    }
    return;
  }

  const randomImage = finalWallpaperList[Math.floor(Math.random() * finalWallpaperList.length)];
  await autoSetWallpaper(randomImage);
  cache.set(CacheKey.LAST_REFRESH_TIME, `${Math.floor(Date.now() / 1000)}`);
}
