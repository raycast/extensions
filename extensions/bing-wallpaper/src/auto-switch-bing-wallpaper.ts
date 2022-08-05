import fetch from "node-fetch";
import { buildBingImageURL, buildBingWallpapersURL, getPictureName } from "./utils/bing-wallpaper-utils";
import { BingResponseData } from "./types/types";
import { setRandomWallpaper } from "./utils/common-utils";

export default async () => {
  await getLatestWallpaper();
};

const getLatestWallpaper = async () => {
  const firstResponse = await fetch(buildBingWallpapersURL(0, 8));
  const bingWallpaperHD = ((await firstResponse.json()) as BingResponseData).images;

  const randomImage = bingWallpaperHD[0];
  await setRandomWallpaper(
    getPictureName(randomImage.url) + "-" + randomImage.startdate,
    buildBingImageURL(randomImage.url, "raw")
  );
};
