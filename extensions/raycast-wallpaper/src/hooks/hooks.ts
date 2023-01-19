import { useCallback, useEffect, useState } from "react";
import { LocalStorageKey, RAYCAST_WALLPAPER_LIST_URL } from "../utils/constants";
import { RaycastWallpaper } from "../types/types";
import { LocalStorage, showToast, Toast } from "@raycast/api";
import { cachePicture, checkCache } from "../utils/common-utils";
import axios from "axios";
import Style = Toast.Style;

export const getRaycastWallpaperList = () => {
  const [raycastWallpapers, setRaycastWallpapers] = useState<RaycastWallpaper[]>([]);

  const fetchData = useCallback(async () => {
    //get wallpaper list
    try {
      const _localStorage = await LocalStorage.getItem<string>(LocalStorageKey.WALLPAPER_LIST_CACHE);
      const _wallpaperList =
        typeof _localStorage === "undefined" ? [] : (JSON.parse(_localStorage) as RaycastWallpaper[]);

      setRaycastWallpapers(_wallpaperList);
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
          setRaycastWallpapers(_raycastWallpaper);

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
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { raycastWallpapers: raycastWallpapers };
};
