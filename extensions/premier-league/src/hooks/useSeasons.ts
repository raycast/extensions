import { useEffect, useState } from "react";
import { getSeasons } from "../api";

interface Season {
  label: string;
  id: number;
}

const useSeasons = () => {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    setLoading(true);
    getSeasons().then((data) => {
      setSeasons(data);
      setLoading(false);
    });
  }, []);

  return { seasons, loading };
};

export default useSeasons;
