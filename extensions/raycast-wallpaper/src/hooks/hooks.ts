import { useCallback, useEffect, useState } from "react";
import { LocalStorageKey, RAYCAST_WALLPAPER_LIST_URL } from "../utils/constants";
import { RaycastWallpaper, RaycastWallpaperWithInfo } from "../types/types";
import { LocalStorage, showToast, Toast } from "@raycast/api";
import { cache, cachePicture, checkCache } from "../utils/common-utils";
import axios from "axios";
import Style = Toast.Style;

export const getRaycastWallpaperList = (refresh: number) => {
  const [raycastWallpapers, setRaycastWallpapers] = useState<RaycastWallpaperWithInfo[]>([]);

  const fetchData = useCallback(async () => {
    //get wallpaper list
    try {
      const _localStorage = await LocalStorage.getItem<string>(LocalStorageKey.WALLPAPER_LIST_CACHE);
      const _wallpaperList =
        typeof _localStorage === "undefined" ? [] : (JSON.parse(_localStorage) as RaycastWallpaper[]);

      const _excludeCache = cache.get(LocalStorageKey.EXCLUDE_LIST_CACHE);
      const _excludeList = typeof _excludeCache === "undefined" ? [] : (JSON.parse(_excludeCache) as string[]);

      const _raycastWallpaperWithInfo1 = _wallpaperList.map((value) => {
        return {
          title: value.title,
          url: value.url,
          exclude: _excludeList.includes(value.url),
        } as RaycastWallpaperWithInfo;
      });

      setRaycastWallpapers(_raycastWallpaperWithInfo1);
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
          const _raycastWallpaperWithInfo2 = _raycastWallpaper.map((value) => {
            return {
              title: value.title,
              url: value.url,
              exclude: _excludeList.includes(value.url),
            } as RaycastWallpaperWithInfo;
          });
          setRaycastWallpapers(_raycastWallpaperWithInfo2);

          //cache list
          LocalStorage.setItem(LocalStorageKey.WALLPAPER_LIST_CACHE, JSON.stringify(_raycastWallpaper));

          _raycastWallpaper.forEach((value) => {
            if (!checkCache(value)) {
              cachePicture(value);
            }
          });
        })
        .catch((error) => {
          showToast(Style.Failure, String(error));
        });
    } catch (e) {
      await showToast(Style.Failure, String(e));
    }
  }, [refresh]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { raycastWallpapers: raycastWallpapers };
};
