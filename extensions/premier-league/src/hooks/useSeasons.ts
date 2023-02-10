import { useEffect, useState } from "react";
import { getSeasons } from "../api";

interface Season {
  label: string;
  id: number;
}

const useSeasons = () => {
  const [seasons, setSeasons] = useState<Season[]>([]);

  useEffect(() => {
    getSeasons().then((data) => {
      setSeasons(data);
    });
  }, []);

  return seasons;
};

export default useSeasons;
