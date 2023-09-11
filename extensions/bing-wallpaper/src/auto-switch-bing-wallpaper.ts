import fetch from "node-fetch";
import { buildBingImageURL, buildBingWallpapersURL, getPictureName } from "./utils/bing-wallpaper-utils";
import { BingResponseData } from "./types/types";
import { setWallpaperWithoutToast } from "./utils/common-utils";
import { environment, LaunchType, showHUD } from "@raycast/api";

export default async () => {
  if (environment.launchType === LaunchType.UserInitiated) {
    await showHUD("Downloading and setting wallpaper...");
  }
  await getLatestWallpaper();
};

const getLatestWallpaper = async () => {
  const firstResponse = await fetch(buildBingWallpapersURL(0, 8));
  const bingWallpaperHD = ((await firstResponse.json()) as BingResponseData).images;

  const randomImage = bingWallpaperHD[0];
  await setWallpaperWithoutToast(
    getPictureName(randomImage.url) + "-" + randomImage.startdate,
    buildBingImageURL(randomImage.url, "raw")
  );
};
