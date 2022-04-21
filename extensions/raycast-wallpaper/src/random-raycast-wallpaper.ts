import { RaycastWallpaper, raycastWallpaperListURL } from "./utils/raycast-wallpaper-utils";
import { setWallpaper } from "./utils/common-utils";
import fetch, { AbortError } from "node-fetch";

export default async () => {
  //get wallpaper list
  try {
    const response = await fetch(raycastWallpaperListURL);
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
