import { useEffect, useState } from "react";
import { getPlayers } from "../api";
import { PlayerContent } from "../types";

const usePlayers = (season: string, page: number) => {
  const [players, setPlayers] = useState<PlayerContent[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (season) {
      setLoading(true);
      getPlayers(season, page).then((data) => {
        setPlayers(data);
        setLoading(false);
      });
    }
  }, [season, page]);

  return { players, loading };
};

export default usePlayers;
