import { useEffect, useState } from "react";
import { RadarImage } from "../types/types";

import data from "../radars.json";

export const getRainRadars = () => {
  const [radars, setRadars] = useState<RadarImage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    setRadars(data.radars);
    setIsLoading(false);
  }, [radars]);

  return {
    radars: radars,
    isLoading: isLoading,
  };
};
