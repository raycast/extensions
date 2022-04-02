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

      getPlayers(team, season, page).then((data) => {
        setPlayers(data);
        setLoading(false);
      });
    }
  }, [team, season, page]);

  return { players, loading };
};

const useStaffs = (team: string, season: string) => {
  const [players, setPlayers] = useState<PlayerContent[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (team && season) {
      setLoading(true);
      setPlayers([]);

      getStaffs(team, season).then((data) => {
        setPlayers(data);
        setLoading(false);
      });
    }
  }, [team, season]);

  return { players, loading };
};

export { usePlayers, useStaffs };
