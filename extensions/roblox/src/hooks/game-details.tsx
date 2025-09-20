import { useFetch } from "@raycast/utils";
import BetterCache from "../modules/better-cache";

const CACHE_TIMEOUT = 2 * 60; // 2 minutes

type Creator = {
  id: number;
  name: string;
  type: "Group" | "User";
  isRNVAccount: boolean;
  hasVerifiedBadge: boolean;
};

type GameDetails = {
  id: number;
  rootPlaceId: number;
  name: string;
  description: string;
  sourceName: string;
  sourceDescription: string;
  creator: Creator;
  price: number | null;
  playing: number;
  visits: number;
  maxPlayers: number;
  created: string;
  updated: string;
  genre: string;
  genre_l1: string;
  genre_l2: string;
  isAllGenre: boolean;
  isFavoritedByUser: boolean;
  favoritedCount: number;
};

type GameDetailsResponse = {
  data: GameDetails[];
};

const cache = new BetterCache<GameDetails>({
  namespace: "roblox-game-details",
  capacity: 100000,
  defaultTTL: CACHE_TIMEOUT,
});

export function useBatchGameDetails(universeIds: number[], useCache?: boolean) {
  const ignoreCache = useCache == false;

  const gameDetails: Record<number, GameDetails> = {};

  const sortedUniverseIds = [...universeIds].sort((a, b) => a.toString().localeCompare(b.toString()));

  const uncachedUniverseIds = sortedUniverseIds.filter((id) => {
    if (!ignoreCache) {
      const cachedData = cache.get(id.toString());
      if (cachedData) {
        gameDetails[id] = cachedData;
        return false;
      }
    }
    return true;
  });

  const queryString = sortedUniverseIds.map((id) => `${id}`).join(",");
  const {
    data: gameDetailsResponse,
    isLoading: gameDetailsLoading,
    revalidate,
  } = useFetch<GameDetailsResponse>(`https://games.roblox.com/v1/games?universeIds=${queryString}`, {
    execute: uncachedUniverseIds.length > 0,
  });

  function revalidateData() {
    universeIds.forEach((id) => {
      cache.remove(id.toString());
    });
    revalidate();
  }

  if (!gameDetailsLoading && gameDetailsResponse) {
    gameDetailsResponse.data.forEach((data) => {
      gameDetails[data.id] = data;
      cache.set(data.id.toString(), data);
    });
  }

  return {
    data: gameDetails,
    isLoading: gameDetailsLoading,
    revalidate: revalidateData,
  };
}

export function useGameDetails(universeId: number, useCache?: boolean) {
  const { data: batchGameDetails, isLoading, revalidate } = useBatchGameDetails([universeId], useCache);

  let gameDetails = null;
  if (!isLoading && batchGameDetails) {
    gameDetails = batchGameDetails[universeId];
  }

  return {
    data: gameDetails,
    isLoading,
    revalidate,
  };
}
