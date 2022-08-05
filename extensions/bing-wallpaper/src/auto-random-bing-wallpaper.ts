import fetch from "node-fetch";
import { buildBingImageURL, buildBingWallpapersURL, getPictureName } from "./utils/bing-wallpaper-utils";
import { getDownloadedBingWallpapers, setDownloadedWallpaper, setRandomWallpaper } from "./utils/common-utils";
import { getPreferenceValues, showHUD } from "@raycast/api";
import { BingResponseData } from "./types/types";
import { Preferences } from "./types/preferences";

export default async () => {
  await getRandomWallpaper();
};

export const getRandomWallpaper = async () => {
  const { includeDownloadedWallpapers } = getPreferenceValues<Preferences>();
  const firstResponse = await fetch(buildBingWallpapersURL(0, 8));
  const secondResponse = await fetch(buildBingWallpapersURL(8, 8));
  const firstResponseDataImages = ((await firstResponse.json()) as BingResponseData).images;
  const secondResponseDataImages = ((await secondResponse.json()) as BingResponseData).images;
  secondResponseDataImages.shift();
  const bingWallpaperHD = firstResponseDataImages.concat(secondResponseDataImages);

  if (includeDownloadedWallpapers) {
    const downloadedBingWallpaper = getDownloadedBingWallpapers();

    if (bingWallpaperHD.length + downloadedBingWallpaper.length != 0) {
      const randomImageIndex = Math.floor(Math.random() * (bingWallpaperHD.length + downloadedBingWallpaper.length));
      if (randomImageIndex < bingWallpaperHD.length) {
        const randomImage = bingWallpaperHD[randomImageIndex];
        await setRandomWallpaper(
          getPictureName(randomImage.url) + "-" + randomImage.startdate,
          buildBingImageURL(randomImage.url, "raw")
        );
      } else {
        const randomImage = downloadedBingWallpaper[randomImageIndex - bingWallpaperHD.length];
        await setDownloadedWallpaper(randomImage.path);
      }
    } else {
      await showHUD("No wallpaper found.");
    }
  } else {
    const randomImageIndex = Math.floor(Math.random() * bingWallpaperHD.length);
    const randomImage = bingWallpaperHD[randomImageIndex];
    await setRandomWallpaper(
      getPictureName(randomImage.url) + "-" + randomImage.startdate,
      buildBingImageURL(randomImage.url, "raw")
    );
  }
};
