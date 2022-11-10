import { useEffect, useState } from "react";
import { getResults } from "../api";
import { Matchday } from "../types/firebase";

export const useFixtures = (competition: string) => {
  const [fixtures, setFixtures] = useState<Matchday[]>();

  useEffect(() => {
    setFixtures(undefined);

    getResults(competition).then((data) => {
      setFixtures(data);
    });
  }, [competition]);

  return fixtures;
};
