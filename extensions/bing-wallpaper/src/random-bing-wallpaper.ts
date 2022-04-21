import fetch from "node-fetch";
import {
  BingResponseData,
  buildBingImageURL,
  buildBingWallpapersURL,
  getPictureName,
} from "./utils/bing-wallpaper-utils";
import { setWallpaper } from "./utils/common-utils";
import { showToast, Toast } from "@raycast/api";

export default async () => {
  const firstResponse = await fetch(buildBingWallpapersURL(0, 8));
  const secondResponse = await fetch(buildBingWallpapersURL(8, 8));
  const firstResponseDataImages = ((await firstResponse.json()) as BingResponseData).images;
  const secondResponseDataImages = ((await secondResponse.json()) as BingResponseData).images;
  secondResponseDataImages.shift();
  const bingWallpaperHD = firstResponseDataImages.concat(secondResponseDataImages);
  if (bingWallpaperHD.length != 0) {
    const randomImage = bingWallpaperHD[Math.floor(Math.random() * bingWallpaperHD.length)];
    await setWallpaper(
      getPictureName(randomImage.url) + "-" + randomImage.startdate,
      buildBingImageURL(randomImage.url, "raw")
    );
  } else {
    await showToast(Toast.Style.Failure, "No wallpaper found.");
  }
};
