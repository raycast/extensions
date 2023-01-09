import { getUserTeamByGameweek } from "./../api/index";
import { useEffect, useState } from "react";

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

const useUserTeamByGameweek = (id: string, gameweek: number | undefined) => {
  const [userTeamByGameweek, setUserTeamByGameweek] = useState<UserTeamByGameweek | null>(null);

  useEffect(() => {
    if (id && gameweek) {
      getUserTeamByGameweek(id, gameweek).then((data) => setUserTeamByGameweek(data));
    }
  }, [id, gameweek]);

  return userTeamByGameweek;
};

export default useUserTeamByGameweek;
