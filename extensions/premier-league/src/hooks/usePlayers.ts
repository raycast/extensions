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
  const [lastPage, setLastPage] = useState<boolean>(false);

  useEffect(() => {
    setPlayers(undefined);
    if (terms.length >= 3) {
      getPlayersWithTerms(terms, page).then((data) => {
        setPlayers(data.players);
        setLastPage(data.lastPage);
      });
    } else if (team && season) {
      if (team === "-1") {
        getPlayers(team, season, page).then((data) => {
          setPlayers(data.players);
          setLastPage(data.lastPage);
        });
      } else {
        getStaffs(team, season).then((data) => {
          setPlayers(data.players);
          setLastPage(data.lastPage);
        });
      }
    }
  }, [team, season, page, terms]);

  return { players, lastPage };
};

export default usePlayers;
