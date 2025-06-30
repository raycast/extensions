import { HellonextWallpapers, hellonextWallpaperURL } from "./libs/hn-wallpaper";
import { setWallpaper } from "./libs/utils";
import fetch, { AbortError } from "node-fetch";

export default async () => {
  //get wallpaper list
  try {
    const response = await fetch(hellonextWallpaperURL);
    //cache wallpaper list
    const _hellonextWallpaper = (await response.json()) as HellonextWallpapers[];
    const randomImage = _hellonextWallpaper[Math.floor(Math.random() * _hellonextWallpaper.length)];
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
