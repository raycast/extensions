import { useCallback, useEffect, useState } from "react";
import fetch, { AbortError } from "node-fetch";
import { RAYCAST_WALLPAPER_LIST_URL } from "../utils/constants";
import { RaycastWallpaper } from "../types/types";
import { cacheIconPreview, cachePicture, checkCache, checkIconCache } from "../utils/common-utils";

export const getRaycastWallpaperList = () => {
  const [raycastWallpapers, setRaycastWallpapers] = useState<RaycastWallpaper[]>([]);

  const fetchData = useCallback(async () => {
    //get wallpaper list
    try {
      fetch(RAYCAST_WALLPAPER_LIST_URL)
        .then((response) => response.json())
        .then((data) => {
          //cache wallpaper list
          const _raycastWallpaper = data as RaycastWallpaper[];
          setRaycastWallpapers(_raycastWallpaper);
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
