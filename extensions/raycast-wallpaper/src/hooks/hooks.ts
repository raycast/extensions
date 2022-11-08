import { useCallback, useEffect, useState } from "react";
import { LocalStorageKey, RAYCAST_WALLPAPER_LIST_URL } from "../utils/constants";
import { RaycastWallpaper } from "../types/types";
import { LocalStorage, showToast, Toast } from "@raycast/api";
import { cachePicture, checkCache } from "../utils/common-utils";
import axios from "axios";
import Style = Toast.Style;

const backupWallpapers: RaycastWallpaper[] = [
  {
    title: "Autumnal Peach",
    url: "https://www.raycast.com/uploads/wallpapers/autumnal-peach.png",
  },
  {
    title: "Blossom",
    url: "https://www.raycast.com/uploads/wallpapers/blossom-2.png",
  },
  {
    title: "Blushing Fire",
    url: "https://www.raycast.com/uploads/wallpapers/blushing-fire.png",
  },
  {
    title: "Bright Rain",
    url: "https://www.raycast.com/uploads/wallpapers/bright-rain.png",
  },
  {
    title: "Floss",
    url: "https://www.raycast.com/uploads/wallpapers/floss.png",
  },
  {
    title: "Glass Rainbow",
    url: "https://www.raycast.com/uploads/wallpapers/glass-rainbow.png",
  },
  {
    title: "Good Vibes",
    url: "https://www.raycast.com/uploads/wallpapers/good-vibes.png",
  },
  {
    title: "Moonrise",
    url: "https://www.raycast.com/uploads/wallpapers/moonrise.png",
  },
  {
    title: "Ray of Lights",
    url: "https://www.raycast.com/uploads/wallpapers/ray-of-lights.png",
  },
  {
    title: "Rose Thorn",
    url: "https://www.raycast.com/uploads/wallpapers/rose-thorn.png",
  },
];

export const getRaycastWallpaperList = () => {
  const [raycastWallpapers, setRaycastWallpapers] = useState<RaycastWallpaper[]>([]);

  const storeRaycastWallpapers = (wallpapers: RaycastWallpaper[]) => {
    setRaycastWallpapers(wallpapers);

    //cache list
    LocalStorage.setItem(LocalStorageKey.WALLPAPER_LIST_CACHE, JSON.stringify(wallpapers));

    wallpapers.forEach((value) => {
      if (!checkCache(value)) {
        cachePicture(value);
      }
    });
  };

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
          storeRaycastWallpapers(axiosRes.data as RaycastWallpaper[]);
        })
        .catch(() => {
          // In the case of an error, use the backup list.
          storeRaycastWallpapers(backupWallpapers);
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
