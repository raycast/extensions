import { useCallback, useEffect, useState } from "react";
import fetch, { AbortError } from "node-fetch";
import { LocalStorageKey, RAYCAST_WALLPAPER_LIST_URL } from "../utils/constants";
import { RaycastWallpaper } from "../types/types";
import { cacheIconPreview, cachePicture, checkCache, checkIconCache } from "../utils/common-utils";
import { LocalStorage } from "@raycast/api";

export const getRaycastWallpaperList = () => {
  const [raycastWallpapers, setRaycastWallpapers] = useState<RaycastWallpaper[]>([]);

  const fetchData = useCallback(async () => {
    //get wallpaper list
    try {
      const _localStorage = await LocalStorage.getItem<string>(LocalStorageKey.WALLPAPER_LIST_CACHE);
      const _wallpaperList =
        typeof _localStorage === "undefined" ? [] : (JSON.parse(_localStorage) as RaycastWallpaper[]);

      if (_wallpaperList.length === 0) {
        fetch(RAYCAST_WALLPAPER_LIST_URL)
          .then((response) => response.json())
          .then((data) => {
            //cache wallpaper list
            const _raycastWallpaper = data as RaycastWallpaper[];
            setRaycastWallpapers(_raycastWallpaper);

            //cache list
            LocalStorage.setItem(LocalStorageKey.WALLPAPER_LIST_CACHE, JSON.stringify(_raycastWallpaper));

            //cache picture
            _raycastWallpaper.forEach((value) => {
              if (!checkCache(value)) {
                cachePicture(value);
              } else {
                if (!checkIconCache(value)) {
                  cacheIconPreview(value);
                }
              }
            });
          });
      } else {
        setRaycastWallpapers(_wallpaperList);
      }
    } catch (e) {
      if (e instanceof AbortError) {
        console.log("Abort");
      } else {
        console.log(e);
      }
      return;
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { raycastWallpapers: raycastWallpapers };
};
