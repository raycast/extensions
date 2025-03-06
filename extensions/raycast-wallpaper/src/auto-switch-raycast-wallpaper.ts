import { cache } from "./utils/common-utils";
import { CacheKey, RAYCAST_WALLPAPER_LIST_URL } from "./utils/constants";
import { RaycastWallpaper } from "./types/types";
import { captureException, closeMainWindow, environment, LaunchType, showHUD } from "@raycast/api";
import axios from "axios";
import { autoSetWallpaper } from "./utils/applescript-utils";
import { refreshIntervalSeconds } from "./types/preferences";

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

    const wallpaperList = _wallpaperList.filter((value) => {
      return !_excludeList.includes(value.url);
    });

    if (_wallpaperList.length !== 0) {
      const randomImage = wallpaperList[Math.floor(Math.random() * wallpaperList.length)];
      await autoSetWallpaper(randomImage);
      // cache last refresh time
      cache.set(CacheKey.LAST_REFRESH_TIME, `${Math.floor(Date.now() / 1000)}`);
    } else {
      //cache picture
      await axios({
        method: "GET",
        url: RAYCAST_WALLPAPER_LIST_URL,
        params: {
          format: "json",
        },
      })
        .then((axiosRes) => {
          const _raycastWallpaper = axiosRes.data as RaycastWallpaper[];
          const raycastWallpaper = _raycastWallpaper.filter((value) => {
            return !_excludeList.includes(value.url);
          });
          const randomImage = raycastWallpaper[Math.floor(Math.random() * raycastWallpaper.length)];
          autoSetWallpaper(randomImage);

          //cache list
          cache.set(CacheKey.WALLPAPER_LIST_CACHE, JSON.stringify(_raycastWallpaper));
          // cache last refresh time
          cache.set(CacheKey.LAST_REFRESH_TIME, `${Math.floor(Date.now() / 1000)}`);
        })
        .catch((error) => {
          captureException(error);
          console.error(error);
        });
    }
  } catch (e) {
    captureException(e);
    console.error(e);
  }
};
