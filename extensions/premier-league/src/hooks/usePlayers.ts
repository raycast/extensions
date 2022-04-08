import { useEffect, useState } from "react";
import { getPlayers, getStaffs } from "../api";
import { PlayerContent } from "../types";

const usePlayers = (team: string, season: string, page: number) => {
  const [players, setPlayers] = useState<PlayerContent[]>();

  useEffect(() => {
    if (team && season) {
      setPlayers(undefined);
      if (team === "-1") {
        getPlayers(team, season, page).then((data) => {
          setPlayers(data);
        });
      } else {
        getStaffs(team, season).then((data) => {
          setPlayers(data);
        });
      }
    }
  }, [team, season, page]);

  return players;
};

export default usePlayers;
