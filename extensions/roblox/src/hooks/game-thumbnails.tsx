import { useFetch } from "@raycast/utils";
import BetterCache from "../modules/better-cache";

const CACHE_TIMEOUT = 30 * 60; // 30 minutes

type GameThumbnailData = {
  universeId: number;
  error: null | string;
  thumbnails: Array<{
    targetId: number;
    state: string;
    imageUrl: string;
    version: string;
  }>;
};

type GameThumbnailResponse = {
  data: GameThumbnailData[];
};

const cache = new BetterCache<string[]>({
  namespace: "roblox-game-thumbnails",
  capacity: 100000,
  defaultTTL: CACHE_TIMEOUT,
});

export function useGameThumbnails(universeId: number, max?: number) {
  const cacheKey = `${universeId}:${max || "all"}`;
  const cachedThumbnails = cache.get(cacheKey);

  const { data: thumbnailData, isLoading: thumbnailDataLoading } = useFetch<GameThumbnailResponse>(
    `https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=${universeId}&countPerUniverse=10&defaults=true&size=768x432&format=Png&isCircular=false`,
    {
      execute: !cachedThumbnails,
    },
  );

  let thumbnailUrls: string[] = cachedThumbnails || [];

  if (!thumbnailDataLoading && thumbnailData && thumbnailData.data.length > 0) {
    thumbnailUrls = thumbnailData.data[0]?.thumbnails.reduce((acc, data) => {
      if (max && acc.length >= max) return acc;
      acc.push(data.imageUrl);
      return acc;
    }, [] as string[]);

    cache.set(cacheKey, thumbnailUrls);
  }

  return {
    data: thumbnailUrls,
    isLoading: !cachedThumbnails && thumbnailDataLoading,
  };
}
