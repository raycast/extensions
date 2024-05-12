import { useAPI } from "./use-api";
import { Tournament } from "../models";

export function useTournaments(game?: string): tournamentsResponse {
  const { data, isLoading } = useAPI({
    query: "/esports/tournaments/ongoing",
    params: {
      gameId: game,
    },
  });

  return {
    tournaments: data as Tournament[],
    isLoading,
  };
}

interface tournamentsResponse {
  tournaments: Tournament[];
  isLoading: boolean;
}
