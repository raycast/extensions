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

function limitThumbnails(thumbnails: string[], max?: number) {
  if (max && max < thumbnails.length) {
    return thumbnails.slice(0, max);
  }
  return thumbnails;
}

export function useBatchGameThumbnails(universeIds: number[], max?: number, useCache?: boolean) {
  const ignoreCache = useCache == false;

  const gameThumbnails: Record<number, string[]> = {};

  const sortedUniverseIds = [...universeIds].sort((a, b) => a.toString().localeCompare(b.toString()));

  const uncachedUniverseIds = sortedUniverseIds.filter((id) => {
    if (!ignoreCache) {
      const cachedData = cache.get(id.toString());
      if (cachedData) {
        gameThumbnails[id] = limitThumbnails(cachedData, max);
        return false;
      }
    }
    return true;
  });

  const queryString = sortedUniverseIds.map((id) => `${id}`).join(",");
  const {
    data: thumbnailData,
    isLoading: thumbnailDataLoading,
    revalidate,
  } = useFetch<GameThumbnailResponse>(
    `https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=${queryString}&countPerUniverse=10&defaults=true&size=768x432&format=Png&isCircular=false`,
    {
      execute: uncachedUniverseIds.length > 0,
    },
  );

  function revalidateData() {
    universeIds.forEach((id) => {
      cache.remove(id.toString());
    });
    revalidate();
  }

  if (!thumbnailDataLoading && thumbnailData) {
    thumbnailData.data.forEach((data) => {
      const id = data.universeId;
      const thumbnails = data.thumbnails
        ?.map((thumbData) => {
          if (thumbData.state !== "Completed") {
            return null;
          }
          return thumbData.imageUrl;
        })
        .filter((val) => val !== null);

      if (!data.error && thumbnails) {
        gameThumbnails[id] = limitThumbnails(thumbnails, max);
        cache.set(id.toString(), thumbnails);
      }
    });
  }

  return {
    data: gameThumbnails,
    isLoading: thumbnailDataLoading,
    revalidate: revalidateData,
  };
}

export function useGameThumbnails(universeId: number, max?: number, useCache?: boolean) {
  const { data: batchGameThumbnails, isLoading, revalidate } = useBatchGameThumbnails([universeId], max, useCache);

  let gameThumbnails: string[] = [];
  if (!isLoading && batchGameThumbnails) {
    gameThumbnails = batchGameThumbnails[universeId];
  }

  return {
    data: gameThumbnails,
    isLoading,
    revalidate,
  };
}
