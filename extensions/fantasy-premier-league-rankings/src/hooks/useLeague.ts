import { useEffect, useState } from "react";
import { getLeague } from "../api";

interface League {
  league: {
    id: number;
    name: string;
    created: string;
  };
  standings: {
    results: {
      id: number;
      player_name: string;
      rank: number;
      last_rank: number;
      rank_sort: number;
      total: number;
      entry: number;
      entry_name: string;
    }[];
  };
}

const useLeague = (leagueId: string | undefined) => {
  const [league, setLeague] = useState<League | null>(null);

  useEffect(() => {
    if (leagueId) {
      getLeague(leagueId).then((data) => setLeague(data));
    }
  }, [leagueId]);

  return league;
};

export default useLeague;
