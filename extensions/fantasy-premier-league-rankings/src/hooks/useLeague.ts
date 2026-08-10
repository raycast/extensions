import { Cache } from "@raycast/api";
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

const cache = new Cache({
  capacity: 1024 * 1024,
});

const useLeague = (leagueId: string | undefined) => {
  const [league, setLeague] = useState<League | null>(null);

  useEffect(() => {
    if (leagueId) {
      const cachedData = cache.get(`league-${leagueId}`);
      if (cachedData) {
        const { value, timestamp } = JSON.parse(cachedData);
        if (Date.now() - timestamp < 3600 * 1000) {
          setLeague(value);
        } else {
          getLeague(leagueId).then((data) => {
            setLeague(data);
            cache.set(`league-${leagueId}`, JSON.stringify({ value: data, timestamp: Date.now() }));
          });
        }
      } else {
        getLeague(leagueId).then((data) => {
          setLeague(data);
          cache.set(`league-${leagueId}`, JSON.stringify({ value: data, timestamp: Date.now() }));
        });
      }
    }
  }, [leagueId]);

  return league;
};

export default useLeague;
