import { useEffect, useState } from "react";
import { getClubs } from "../api";
import { TeamTeam } from "../types";

const useClubs = (season: string) => {
  const [clubs, setClubs] = useState<TeamTeam[]>();

  useEffect(() => {
    if (season) {
      setClubs(undefined);
      getClubs(season).then((data) => {
        setClubs(data);
      });
    }
  }, [season]);

  return clubs;
};

export default useClubs;
