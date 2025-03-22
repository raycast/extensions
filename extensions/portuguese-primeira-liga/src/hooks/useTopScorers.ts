import { useEffect, useState } from "react";
import { getTopScorers } from "../api";
import { TopScorer } from "../types";
import { Cache } from "@raycast/api";

const cache = new Cache();

const useTopScorers = () => {
  const [topScorers, setTopScorers] = useState<TopScorer[]>();

  useEffect(() => {
    const currentDate = new Date();
    const dayMonth = `${currentDate.getDate()}-${currentDate.getMonth()}`;

    const cachedData = cache.get(`topScorers-${dayMonth}`);
    if (cachedData) {
      const cachedTopScorers = JSON.parse(cachedData);
      setTopScorers(cachedTopScorers);
    } else {
      getTopScorers().then((data) => {
        setTopScorers(data);
        cache.set(`topScorers-${dayMonth}`, JSON.stringify(data));
      });
    }
  }, []);

  return topScorers;
};

export default useTopScorers;
