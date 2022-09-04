import { autoSetWallpaper } from "./utils/common-utils";
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

    if (_wallpaperList.length !== 0) {
      const randomImage = _wallpaperList[Math.floor(Math.random() * _wallpaperList.length)];
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
          const __raycastWallpaper = axiosRes.data as RaycastWallpaper[];
          //fix AxiosError: Request failed with status code 500
          const _raycastWallpaper = __raycastWallpaper.map((value) => {
            if (value.title === "Blossom") {
              value.url = "https://www.raycast.com/uploads/wallpapers/blossom-2.png";
            }
            return value;
          });
          const randomImage = _raycastWallpaper[Math.floor(Math.random() * _raycastWallpaper.length)];
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
