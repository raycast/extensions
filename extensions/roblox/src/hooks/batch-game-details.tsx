import { useFetch } from "@raycast/utils";

type Creator = {
  id: number;
  name: string;
  type: string;
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

export function useBatchGameDetails(universeIds: number[]) {
  const sortedUniverseIds = [...universeIds].sort((a, b) => a.toString().localeCompare(b.toString()));
  const queryString = sortedUniverseIds.map((id) => `universeIds=${id}`).join("&");
  const { data: gameDetailsResponse, isLoading: gameDetailsLoading } = useFetch<GameDetailsResponse>(
    `https://games.roblox.com/v1/games?${queryString}`,
    {
      execute: sortedUniverseIds.length > 0,
    },
  );

  const gameDetails: Record<number, GameDetails> = {};
  if (gameDetailsResponse) {
    gameDetailsResponse.data.forEach((data) => {
      gameDetails[data.id] = data;
    });
  }

  return {
    data: gameDetails,
    isLoading: gameDetailsLoading,
  };
}
