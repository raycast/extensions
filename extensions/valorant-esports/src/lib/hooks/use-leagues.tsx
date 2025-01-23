import { useAPI } from "./use-api";

export function useLeagues() {
  const { data, isLoading } = useAPI<LeaguesResponse>({
    query: "getLeagues",
  });

  return {
    leagues: data?.data.leagues,
    isLoading,
  };
}

interface LeaguesResponse {
  data: {
    leagues: League[];
  };
}

export interface League {
  id: string;
  slug: string;
  name: string;
  region: string;
  image: string;
  priority: number;
  displayPriority: {
    position: number;
    status: string;
  };
  tournaments: TournamentsItem[];
}

interface TournamentsItem {
  id: string;
  slug: string;
  startDate: string;
  endDate: string;
}
