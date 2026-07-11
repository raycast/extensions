import fetch, { AbortError } from "node-fetch";
import { buildBingWallpapersURL } from "../utils/bing-wallpaper-utils";
import { showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { BingImage, BingResponseData, DownloadedBingImage } from "../types/types";
import { autoDownloadPictures, getDownloadedBingWallpapers } from "../utils/common-utils";
import { autoDownload, downloadSize } from "../types/preferences";

export const getBingWallpapers = (showDownloadedWallpapers: boolean) => {
  const [bingWallpaperHD, setBingWallpaperHD] = useState<BingImage[]>([]);
  const [downloadedBingWallpapers, setDownloadedBingWallpapers] = useState<DownloadedBingImage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    try {
      fetch(buildBingWallpapersURL(0, 8))
        .then((first_res) => first_res.json())
        .then((first_data) => {
          fetch(buildBingWallpapersURL(8, 8))
            .then((second_res) => second_res.json())
            .then((second_data) => {
              //Remove duplicate elements
              (second_data as BingResponseData).images.shift();
              const _bingWallpaperHD = (first_data as BingResponseData).images.concat(
                (second_data as BingResponseData).images,
              );

              setBingWallpaperHD(_bingWallpaperHD);
              if (showDownloadedWallpapers) {
                setDownloadedBingWallpapers(getDownloadedBingWallpapers());
              }
              setIsLoading(false);
            })
            .catch(async (e) => {
              await showToast(Toast.Style.Failure, String(e));
              setIsLoading(false);
            });
        })
        .catch(async (e) => {
          await showToast(Toast.Style.Failure, String(e));
          setIsLoading(false);
        });
    } catch (e) {
      if (e instanceof AbortError) {
        return;
      }
      await showToast(Toast.Style.Failure, String(e));
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { bingWallpaperHD: bingWallpaperHD, downloadedBingWallpapers: downloadedBingWallpapers, isLoading: isLoading };
};

export const autoDownloadWallpapers = (bingWallpapers: BingImage[]) => {
  const fetchData = useCallback(async () => {
    try {
      //auto download wallpaper
      if (autoDownload) {
        await autoDownloadPictures(downloadSize, bingWallpapers);
      }
    } catch (e) {
      console.error(String(e));
    }
  }, [bingWallpapers]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);
};
