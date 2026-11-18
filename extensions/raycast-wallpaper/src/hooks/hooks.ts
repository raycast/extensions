import { useCallback, useEffect, useState } from "react";
import { CacheKey, RAYCAST_WALLPAPER_LIST_URL } from "../utils/constants";
import { RaycastWallpaper, RaycastWallpaperWithInfo } from "../types/types";
import { captureException, showToast, Toast } from "@raycast/api";
import { cache } from "../utils/common-utils";
import axios from "axios";
import { getAppearanceByTitle } from "../utils/appearance-utils";
import { respectAppearance } from "../types/preferences";
import { getSystemAppearance } from "../utils/platform-utils";
import Style = Toast.Style;

export const useRaycastWallpaperList = (refresh: number) => {
  const [raycastWallpapers, setRaycastWallpapers] = useState<RaycastWallpaperWithInfo[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    //get wallpaper list
    try {
      const systemAppearance = respectAppearance ? await getSystemAppearance() : undefined;
      const _localStorage = cache.get(CacheKey.WALLPAPER_LIST_CACHE);
      const _wallpaperList =
        typeof _localStorage === "undefined" ? [] : (JSON.parse(_localStorage) as RaycastWallpaper[]);

      const _excludeCache = cache.get(CacheKey.EXCLUDE_LIST_CACHE);
      const _excludeList = typeof _excludeCache === "undefined" ? [] : (JSON.parse(_excludeCache) as string[]);

      const updateWallpapers = (wallpapers: RaycastWallpaper[]) => {
        const wallpapersWithInfo = wallpapers.map((wallpaper) => ({
          title: wallpaper.title,
          url: wallpaper.url,
          exclude: _excludeList.includes(wallpaper.url),
          appearance: getAppearanceByTitle(wallpaper.title),
        }));
        setRaycastWallpapers(
          respectAppearance
            ? wallpapersWithInfo.filter((wallpaper) => wallpaper.appearance === systemAppearance)
            : wallpapersWithInfo,
        );
      };

      updateWallpapers(_wallpaperList);

      // Fetch the latest wallpaper list.
      await axios({
        method: "GET",
        url: RAYCAST_WALLPAPER_LIST_URL,
        params: {
          format: "json",
        },
      })
        .then((axiosRes) => {
          const _raycastWallpaper = axiosRes.data as RaycastWallpaper[];
          updateWallpapers(_raycastWallpaper);

          //cache list
          cache.set(CacheKey.WALLPAPER_LIST_CACHE, JSON.stringify(_raycastWallpaper));
        })
        .catch((error) => {
          captureException(error);
          console.error(error);
          void showToast(Style.Failure, "Could not load wallpapers");
        });
    } catch (e) {
      await showToast(Style.Failure, String(e));
    } finally {
      setIsLoading(false);
    }
  }, [refresh]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { raycastWallpapers, isLoading };
};
