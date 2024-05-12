import { useAPI } from "./use-api";
import { Game } from "../models";

export function useGames(): gamesResponse {
  const { data, isLoading } = useAPI({
    query: "/games",
  });

  return {
    games: data as Game[],
    isLoading,
  };
}

interface gamesResponse {
  games: Game[];
  isLoading: boolean;
}
