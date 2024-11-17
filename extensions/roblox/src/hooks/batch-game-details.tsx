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
  const gameDetails: Record<number, GameDetails> = {};

  const sortedUniverseIds = universeIds
    .map((id) => {
      if (useCache !== false) {
        const cachedData = cache.get(id.toString());
        if (cachedData) {
          gameDetails[id] = cachedData;
          return null;
        }
      }
      return id;
    })
    .filter((id) => id !== null)
    .sort((a, b) => a.toString().localeCompare(b.toString()));

  const queryString = sortedUniverseIds.map((id) => `${id}`).join(",");
  const { data: gameDetailsResponse, isLoading: gameDetailsLoading } = useFetch<GameDetailsResponse>(
    `https://games.roblox.com/v1/games?universeIds=${queryString}`,
    {
      execute: sortedUniverseIds.length > 0,
    },
  );

  if (gameDetailsResponse) {
    gameDetailsResponse.data.forEach((data) => {
      gameDetails[data.id] = data;
      cache.set(data.id.toString(), data);
    });
  }

  return {
    data: gameDetails,
    isLoading: gameDetailsLoading,
  };
}

export function useGameDetails(universeId: number, useCache?: boolean) {
  const { data: batchGameDetails, isLoading } = useBatchGameDetails([universeId], useCache);

  let gameDetails = null;
  if (!isLoading && batchGameDetails) {
    gameDetails = batchGameDetails[universeId];
  }

  return {
    data: gameDetails,
    isLoading,
  };
}
