import { autoSetWallpaper, cache } from "./utils/common-utils";
import { LocalStorageKey, RAYCAST_WALLPAPER_LIST_URL } from "./utils/constants";
import { RaycastWallpaper } from "./types/types";
import { environment, LaunchType, LocalStorage, showHUD } from "@raycast/api";
import axios from "axios";

export default async () => {
  if (environment.launchType === LaunchType.UserInitiated) {
    await showHUD("Downloading and setting wallpaper...");
  }
  await getRandomWallpaper();
};

export const getRandomWallpaper = async () => {
  try {
    const _localStorage = await LocalStorage.getItem<string>(LocalStorageKey.WALLPAPER_LIST_CACHE);
    const _wallpaperList =
      typeof _localStorage === "undefined" ? [] : (JSON.parse(_localStorage) as RaycastWallpaper[]);

    const _excludeCache = cache.get(LocalStorageKey.EXCLUDE_LIST_CACHE);
    const _excludeList = typeof _excludeCache === "undefined" ? [] : (JSON.parse(_excludeCache) as string[]);

    const wallpaperList = _wallpaperList.filter((value) => {
      return !_excludeList.includes(value.url);
    });

    if (_wallpaperList.length !== 0) {
      const randomImage = wallpaperList[Math.floor(Math.random() * wallpaperList.length)];
      await autoSetWallpaper(randomImage);
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
          LocalStorage.setItem(LocalStorageKey.WALLPAPER_LIST_CACHE, JSON.stringify(_raycastWallpaper));
        })
        .catch((error) => {
          showHUD(String(error));
        });
    }
  } catch (e) {
    await showHUD(String(e));
  }
};
