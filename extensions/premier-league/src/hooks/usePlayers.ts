import { useEffect, useState } from "react";
import { getPlayers, getPlayersWithTerms, getStaffs } from "../api";
import { PlayerContent } from "../types";

const usePlayers = (
  team: string,
  season: string,
  page: number,
  terms: string
) => {
  const [players, setPlayers] = useState<PlayerContent[]>();

  useEffect(() => {
    setPlayers(undefined);
    if (terms.length >= 3) {
      getPlayersWithTerms(terms).then((data) => {
        setPlayers(data);
      });
    } else if (team && season) {
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
  }, [team, season, page, terms]);

  return players;
};

export default usePlayers;
