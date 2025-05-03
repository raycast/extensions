import { getUserTeamByGameweek } from "../api";
import { useEffect, useState } from "react";
import { Cache } from "@raycast/api";

interface UserTeamByGameweek {
  entry_history: {
    event: number;
    points: number;
    total_points: number;
    rank: number;
    overall_rank: number;
    bank: number;
    value: number;
    event_transfers: number;
    event_transfers_cost: number;
    points_on_bench: number;
  };
  picks: {
    element: number;
    position: number;
    multiplier: number;
    is_captain: boolean;
    is_vice_captain: boolean;
  }[];
}

const cache = new Cache({
  capacity: 1024 * 1024,
});

const useUserTeamByGameweek = (id: string, gameweek: number | undefined) => {
  const [userTeamByGameweek, setUserTeamByGameweek] = useState<UserTeamByGameweek | null>(null);

  useEffect(() => {
    if (id && gameweek) {
      const cachedData = cache.get(`userTeamByGameweek-${id}-${gameweek}`);
      if (cachedData) {
        const { value, timestamp } = JSON.parse(cachedData);
        if (Date.now() - timestamp < 3600 * 1000) {
          setUserTeamByGameweek(value);
        } else {
          getUserTeamByGameweek(id, gameweek).then((data) => {
            setUserTeamByGameweek(data);
            cache.set(`userTeamByGameweek-${id}-${gameweek}`, JSON.stringify({ value: data, timestamp: Date.now() }));
          });
        }
      } else {
        getUserTeamByGameweek(id, gameweek).then((data) => {
          setUserTeamByGameweek(data);
          cache.set(`userTeamByGameweek-${id}-${gameweek}`, JSON.stringify({ value: data, timestamp: Date.now() }));
        });
      }
    }
  }, [id, gameweek]);

  return userTeamByGameweek;
};

export default useUserTeamByGameweek;
