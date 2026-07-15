import { Toast, captureException, showToast } from "@raycast/api";
import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { respectAppearance } from "../types/preferences";
import type { ResendWallpaper, ResendWallpaperWithInfo } from "../types/types";
import { getAppearanceByTitle } from "../utils/appearance-utils";
import { getSystemAppearance } from "../utils/applescript-utils";
import { cache, cachePicture, checkCache } from "../utils/common-utils";
import { CacheKey, RESEND_WALLPAPER_LIST_URL } from "../utils/constants";
import Style = Toast.Style;
import { showFailureToast } from "@raycast/utils";

export const getResendWallpaperList = (refresh: number) => {
  const [resendWallpapers, setResendWallpapers] = useState<ResendWallpaperWithInfo[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const systemAppearance = await getSystemAppearance();
      let wallpaperRespectAppearance: ResendWallpaperWithInfo[] = [];
      const _localStorage = cache.get(CacheKey.WALLPAPER_LIST_CACHE);
      const _wallpaperList =
        typeof _localStorage === "undefined" ? [] : (JSON.parse(_localStorage) as ResendWallpaper[]);

      const _excludeCache = cache.get(CacheKey.EXCLUDE_LIST_CACHE);
      const _excludeList = typeof _excludeCache === "undefined" ? [] : (JSON.parse(_excludeCache) as string[]);

      const _resendWallpaperWithInfo1 = _wallpaperList.map((value) => {
        return {
          title: value.title,
          url: value.url,
          exclude: _excludeList.includes(value.url),
          appearance: getAppearanceByTitle(value.title),
        } as ResendWallpaperWithInfo;
      });

      if (respectAppearance) {
        wallpaperRespectAppearance = _resendWallpaperWithInfo1.filter((value) => {
          return value.appearance === systemAppearance;
        });
      } else {
        wallpaperRespectAppearance = _resendWallpaperWithInfo1;
      }
      setResendWallpapers(wallpaperRespectAppearance);

      // Cache picture
      await axios({
        method: "GET",
        url: RESEND_WALLPAPER_LIST_URL,
        params: {
          format: "json",
        },
      })
        .then((axiosRes) => {
          const _resendWallpaper = axiosRes.data as ResendWallpaper[];
          const _resendWallpaperWithInfo = _resendWallpaper.map((value) => {
            return {
              title: value.title,
              url: value.url,
              exclude: _excludeList.includes(value.url),
              appearance: getAppearanceByTitle(value.title),
            } as ResendWallpaperWithInfo;
          });
          if (respectAppearance) {
            wallpaperRespectAppearance = _resendWallpaperWithInfo.filter((value) => {
              return value.appearance === systemAppearance;
            });
          } else {
            wallpaperRespectAppearance = _resendWallpaperWithInfo;
          }
          setResendWallpapers(wallpaperRespectAppearance);

          // Cache list
          cache.set(CacheKey.WALLPAPER_LIST_CACHE, JSON.stringify(_resendWallpaper));

          for (const value of _resendWallpaper) {
            if (!checkCache(value)) {
              cachePicture(value);
            }
          }
        })
        .catch((error) => {
          captureException(error);
          console.error(error);
          showFailureToast(error, { title: "Failed to fetch wallpapers" });
        });
    } catch (e) {
      await showToast(Style.Failure, String(e));
    }
  }, [refresh]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { resendWallpapers };
};
