import fetch from "node-fetch";
import { buildBingImageURL, buildBingWallpapersURL, getPictureName } from "./utils/bing-wallpaper-utils";
import { BingResponseData } from "./types/types";
import { autoDownloadPictures, setOnlineWallpaper } from "./utils/common-utils";
import { environment, LaunchType, showHUD } from "@raycast/api";
import { autoDownload, downloadSize } from "./types/preferences";

export default async () => {
  if (environment.launchType === LaunchType.UserInitiated) {
    await showHUD("Downloading and setting wallpaper...");
  }
  await getLatestWallpaper();
};

const getLatestWallpaper = async () => {
  const firstResponse = await fetch(buildBingWallpapersURL(0, 8)).catch(async (e) => {
    console.error(e);
    return undefined;
  });
  if (typeof firstResponse == "undefined") {
    return;
  }
  try {
    const bingWallpaperHD = ((await firstResponse.json()) as BingResponseData).images;
    if (autoDownload) {
      await autoDownloadPictures(downloadSize, bingWallpaperHD);
    }
    const randomImage = bingWallpaperHD[0];
    await setOnlineWallpaper(
      getPictureName(randomImage.url) + "-" + randomImage.startdate,
      buildBingImageURL(randomImage.url, "raw"),
      false,
    );
  } catch (e) {
    console.error(e);
  }
};
