import { useAPI } from "./use-api";

export function useTournaments(leagueId: string) {
  const { data, isLoading } = useAPI<TournamentsByLeagueResponse>({
    query: "getLeaguesForStandings",
  });

  const league = data?.data.leagues.find((l) => l.id === leagueId);

  return {
    tournaments: league?.tournaments,
    isLoading,
  };
}

interface TournamentsByLeagueResponse {
  data: {
    leagues: LeaguesItem[];
  };
}

interface LeaguesItem {
  id: string;
  tournaments: TournamentsItem[];
}

interface TournamentsItem {
  id: string;
  slug: string;
  startDate: string;
  endDate: string;
}
