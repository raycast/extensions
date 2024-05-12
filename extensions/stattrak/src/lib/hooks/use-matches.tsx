import { useAPI } from "./use-api";
import { Matche } from "../models";

export function useMatches(game?: string): matchesResponse {
  const { data, isLoading } = useAPI({
    query: "/esports/calendar/upcoming",
    params: {
      gameId: game,
    },
  });

  return {
    matches: data as Matche[],
    isLoading,
  };
}

interface matchesResponse {
  matches: Matche[];
  isLoading: boolean;
}
