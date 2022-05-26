import { setWallpaper } from "./utils/common-utils";
import fetch, { AbortError } from "node-fetch";
import { RAYCAST_WALLPAPER_LIST_URL } from "./utils/constants";
import { RaycastWallpaper } from "./types/types";

export default async () => {
  try {
    const response = await fetch(RAYCAST_WALLPAPER_LIST_URL);
    //cache wallpaper list
    const _raycastWallpaper = (await response.json()) as RaycastWallpaper[];
    const randomImage = _raycastWallpaper[Math.floor(Math.random() * _raycastWallpaper.length)];
    await setWallpaper(randomImage);
  } catch (e) {
    if (e instanceof AbortError) {
      console.log("Abort");
    } else {
      console.log(e);
    }
    return;
  }
};
