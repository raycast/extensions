import { useEffect, useState } from "react";
import { getClubs } from "../api";
import { TeamTeam } from "../types";

const useClubs = (season: string) => {
  const [clubs, setClubs] = useState<TeamTeam[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (season) {
      setLoading(true);
      getClubs(season).then((data) => {
        setClubs(data);
        setLoading(false);
      });
    }
  }, [season]);

  return { clubs, loading };
};

export default useClubs;
