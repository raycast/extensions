import { useEffect, useState } from "react";
import { getSeasons } from "../api";

interface Season {
  label: string;
  id: number;
}

const useSeasons = (comps = "1") => {
  const [seasons, setSeasons] = useState<Season[]>([]);

  useEffect(() => {
    getSeasons(comps).then((data) => {
      setSeasons(data);
    });
  }, [comps]);

  return seasons;
};

export default useSeasons;
