import { useAPI } from "./use-api";

export function useTournaments(leagueId: string) {
  const { data, isLoading } = useAPI<TournamentsByLeagueResponse>({
    query: "getTournamentsForLeague",
    params: { leagueId },
  });

  return {
    tournaments: data?.data.leagues[0].tournaments,
    isLoading,
  };
}

export interface TournamentsByLeagueResponse {
  data: {
    leagues: LeaguesItem[];
  };
}

interface LeaguesItem {
  tournaments: TournamentsItem[];
}

interface TournamentsItem {
  id: string;
  slug: string;
  startDate: string;
  endDate: string;
}
