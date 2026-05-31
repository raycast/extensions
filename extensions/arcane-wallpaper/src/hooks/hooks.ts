import { useCallback, useEffect, useState } from "react";
import { CacheKey } from "../utils/constants";
import { ArcaneWallpaper, ArcaneWallpaperWithInfo } from "../types/types";
import { captureException, showToast, Toast } from "@raycast/api";
import { cache } from "../utils/common-utils";
import { getArcaneWallpapersFromDrive } from "../wallpapers";
import Style = Toast.Style;

export const getArcaneWallpaperList = (refresh: number) => {
  const [arcaneWallpapers, setArcaneWallpapers] = useState<ArcaneWallpaperWithInfo[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const _excludeCache = cache.get(CacheKey.EXCLUDE_LIST_CACHE);
      const _excludeList = typeof _excludeCache === "undefined" ? [] : (JSON.parse(_excludeCache) as string[]);
      const cachedWallpapers = cache.get(CacheKey.WALLPAPER_LIST_CACHE);
      const cachedCatalog =
        typeof cachedWallpapers === "undefined" ? [] : (JSON.parse(cachedWallpapers) as ArcaneWallpaper[]);

      const wallpaperCatalog = await getArcaneWallpapersFromDrive();
      const sourceCatalog = wallpaperCatalog.length > 0 ? wallpaperCatalog : cachedCatalog;
      const wallpapersWithInfo = sourceCatalog.map((value) => {
        return {
          title: value.title,
          category: value.category,
          url: value.url,
          thumbnailUrl: value.thumbnailUrl,
          exclude: _excludeList.includes(value.url),
        } as ArcaneWallpaperWithInfo;
      });

      setArcaneWallpapers(wallpapersWithInfo);
      cache.set(CacheKey.WALLPAPER_LIST_CACHE, JSON.stringify(sourceCatalog));
    } catch (e) {
      captureException(e);
      await showToast(Style.Failure, String(e));
    }
  }, [refresh]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { arcaneWallpapers: arcaneWallpapers };
};
