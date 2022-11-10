import { useEffect, useState } from "react";
import { getStandings } from "../api";
import { Table } from "../types";
import { Cache } from "@raycast/api";

const cache = new Cache();

const useStandings = () => {
  const [standings, setStandings] = useState<Table[]>();

  useEffect(() => {
    const currentDate = new Date();
    const dayMonth = `${currentDate.getDate()}-${currentDate.getMonth()}`;

    const cachedData = cache.get(`standings-${dayMonth}`);
    if (cachedData) {
      const cachedStandings = JSON.parse(cachedData);
      setStandings(cachedStandings);
    } else {
      getStandings().then((data) => {
        setStandings(data);
        cache.set(`standings-${dayMonth}`, JSON.stringify(data));
      });
    }
  }, []);

  return standings;
};

export default useStandings;
