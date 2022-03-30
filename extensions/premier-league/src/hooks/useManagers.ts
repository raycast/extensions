import { useEffect, useState } from "react";
import { getManagers } from "../api";
import { PlayerContent } from "../types";

const useManagers = (season: string) => {
  const [managers, setManagers] = useState<PlayerContent[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (season) {
      setLoading(true);
      getManagers(season).then((data) => {
        setManagers(data);
        setLoading(false);
      });
    }
  }, [season]);

  return { managers, loading };
};

export default useManagers;
