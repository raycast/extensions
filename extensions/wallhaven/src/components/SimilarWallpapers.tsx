import { useCallback, useRef } from "react";
import { useCachedPromise } from "@raycast/utils";
import { searchWallpapers } from "../api";
import { Wallpaper } from "../types";
import { WallpaperGrid } from "./WallpaperGrid";

export function SimilarWallpapers({ wallpaperId }: { wallpaperId: string }) {
  const allWallpapers = useRef<Wallpaper[]>([]);
  const currentPage = useRef(1);
  const hasMore = useRef(true);

  const { isLoading, revalidate } = useCachedPromise(
    async (id: string, page: number) => {
      const result = await searchWallpapers({
        q: `like:${id}`,
        page,
      });
      hasMore.current = result.meta.current_page < result.meta.last_page;
      if (page === 1) {
        allWallpapers.current = result.data;
      } else {
        allWallpapers.current = [...allWallpapers.current, ...result.data];
      }
      return allWallpapers.current;
    },
    [wallpaperId, currentPage.current],
    { keepPreviousData: true },
  );

  const onLoadMore = useCallback(() => {
    if (hasMore.current && !isLoading) {
      currentPage.current += 1;
      revalidate();
    }
  }, [isLoading, revalidate]);

  return (
    <WallpaperGrid
      wallpapers={allWallpapers.current}
      isLoading={isLoading}
      hasMore={hasMore.current}
      onLoadMore={onLoadMore}
      navigationTitle="Similar Wallpapers"
      searchBarPlaceholder={`Similar to ${wallpaperId}`}
    />
  );
}
