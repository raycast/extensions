import { useCallback, useEffect, useState } from "react";
import { CacheKey, RAYCAST_WALLPAPER_LIST_URL } from "../utils/constants";
import { RaycastWallpaper, RaycastWallpaperWithInfo } from "../types/types";
import { captureException, showToast, Toast } from "@raycast/api";
import { cache, cachePicture, checkCache } from "../utils/common-utils";
import axios from "axios";
import { getAppearanceByTitle } from "../utils/appearance-utils";
import { respectAppearance } from "../types/preferences";
import { getSystemAppearance } from "../utils/applescript-utils";
import Style = Toast.Style;

export const getRaycastWallpaperList = (refresh: number) => {
  const [raycastWallpapers, setRaycastWallpapers] = useState<RaycastWallpaperWithInfo[]>([]);

  const fetchData = useCallback(async () => {
    //get wallpaper list
    try {
      const systemAppearance = await getSystemAppearance();
      let wallpaperRespectAppearance: RaycastWallpaperWithInfo[] = [];
      const _localStorage = cache.get(CacheKey.WALLPAPER_LIST_CACHE);
      const _wallpaperList =
        typeof _localStorage === "undefined" ? [] : (JSON.parse(_localStorage) as RaycastWallpaper[]);

      const _excludeCache = cache.get(CacheKey.EXCLUDE_LIST_CACHE);
      const _excludeList = typeof _excludeCache === "undefined" ? [] : (JSON.parse(_excludeCache) as string[]);

      const _raycastWallpaperWithInfo1 = _wallpaperList.map((value) => {
        return {
          title: value.title,
          url: value.url,
          exclude: _excludeList.includes(value.url),
          appearance: getAppearanceByTitle(value.title),
        } as RaycastWallpaperWithInfo;
      });

      if (respectAppearance) {
        wallpaperRespectAppearance = _raycastWallpaperWithInfo1.filter((value) => {
          return value.appearance === systemAppearance;
        });
      } else {
        wallpaperRespectAppearance = _raycastWallpaperWithInfo1;
      }
      setRaycastWallpapers(wallpaperRespectAppearance);

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
          const _raycastWallpaperWithInfo = _raycastWallpaper.map((value) => {
            return {
              title: value.title,
              url: value.url,
              exclude: _excludeList.includes(value.url),
              appearance: getAppearanceByTitle(value.title),
            } as RaycastWallpaperWithInfo;
          });
          if (respectAppearance) {
            wallpaperRespectAppearance = _raycastWallpaperWithInfo.filter((value) => {
              return value.appearance === systemAppearance;
            });
          } else {
            wallpaperRespectAppearance = _raycastWallpaperWithInfo;
          }
          setRaycastWallpapers(wallpaperRespectAppearance);

          //cache list
          cache.set(CacheKey.WALLPAPER_LIST_CACHE, JSON.stringify(_raycastWallpaper));

          _raycastWallpaper.forEach((value) => {
            if (!checkCache(value)) {
              cachePicture(value);
            }
          });
        })
        .catch((error) => {
          captureException(error);
          console.error(error);
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
