import fetch from "node-fetch";
import { buildBingImageURL, buildBingWallpapersURL, getPictureName } from "./utils/bing-wallpaper-utils";
import {
  autoDownloadPictures,
  getDownloadedBingWallpapers,
  setLocalWallpaper,
  setOnlineWallpaper,
} from "./utils/common-utils";
import { environment, LaunchType, showHUD } from "@raycast/api";
import { BingResponseData } from "./types/types";
import { autoDownload, downloadSize, includeDownloadedWallpapers } from "./types/preferences";
import { canRefresh, recordRefresh } from "./utils/refresh-record";

export default async () => {
  if (environment.launchType === LaunchType.UserInitiated) {
    await showHUD("Downloading and setting wallpaper...");
  }
  if (canRefresh()) {
    recordRefresh();
    await getRandomWallpaper();
  }
};

export const getRandomWallpaper = async () => {
  const firstResponse = await fetch(buildBingWallpapersURL(0, 8)).catch(async (e) => {
    console.error(e);
    return undefined;
  });
  const secondResponse = await fetch(buildBingWallpapersURL(8, 8)).catch(async (e) => {
    console.error(e);
    return undefined;
  });
  if (typeof firstResponse == "undefined" || typeof secondResponse == "undefined") {
    return;
  }
  try {
    const firstResponseDataImages = ((await firstResponse.json()) as BingResponseData).images;
    const secondResponseDataImages = ((await secondResponse.json()) as BingResponseData).images;
    secondResponseDataImages.shift();
    const bingWallpaperHD = firstResponseDataImages.concat(secondResponseDataImages);

    if (autoDownload) {
      await autoDownloadPictures(downloadSize, bingWallpaperHD);
    }

    if (includeDownloadedWallpapers) {
      const downloadedBingWallpaper = getDownloadedBingWallpapers();

      if (bingWallpaperHD.length + downloadedBingWallpaper.length != 0) {
        const randomImageIndex = Math.floor(Math.random() * (bingWallpaperHD.length + downloadedBingWallpaper.length));
        if (randomImageIndex < bingWallpaperHD.length) {
          const randomImage = bingWallpaperHD[randomImageIndex];
          await setOnlineWallpaper(
            getPictureName(randomImage.url) + "-" + randomImage.startdate,
            buildBingImageURL(randomImage.url, "raw"),
            false,
          );
        } else {
          const randomImage = downloadedBingWallpaper[randomImageIndex - bingWallpaperHD.length];
          await setLocalWallpaper(randomImage.path, false);
        }
      } else {
        await showHUD("No wallpaper found.");
      }
    } else {
      const randomImageIndex = Math.floor(Math.random() * bingWallpaperHD.length);
      const randomImage = bingWallpaperHD[randomImageIndex];
      await setOnlineWallpaper(
        getPictureName(randomImage.url) + "-" + randomImage.startdate,
        buildBingImageURL(randomImage.url, "raw"),
        false,
      );
    }
  } catch (e) {
    console.error(e);
  }
};
