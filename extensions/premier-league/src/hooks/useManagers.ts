import { useEffect, useState } from "react";
import { getManagers } from "../api";
import { PlayerContent } from "../types";

const useManagers = (season: string) => {
  const [managers, setManagers] = useState<PlayerContent[]>();

  useEffect(() => {
    if (season) {
      getManagers(season).then((data) => {
        setManagers(data);
      });
    }
  }, [season]);

  return managers;
};

export default useManagers;
