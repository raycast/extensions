import { useEffect, useState } from "react";
import { getPlayers, getStaffs } from "../api";
import { PlayerContent } from "../types";

const usePlayers = (team: string, season: string, page: number) => {
  const [players, setPlayers] = useState<PlayerContent[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (team && season) {
      setLoading(true);
      setPlayers([]);

      if (team === "-1") {
        getPlayers(team, season, page).then((data) => {
          setPlayers(data);
          setLoading(false);
        });
      } else {
        getStaffs(team, season).then((data) => {
          setPlayers(data);
          setLoading(false);
        });
      }
    }
  }, [team, season, page]);

  return { players, loading };
};

export default usePlayers;
