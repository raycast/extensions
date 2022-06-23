import { useEffect, useState } from "react";
import { getStandings } from "../api";
import { Table } from "../types";

const useStandings = () => {
  const [standings, setStandings] = useState<Table[]>();

  useEffect(() => {
    setStandings(undefined);

    getStandings().then((data) => {
      setStandings(data);
    });
  }, []);

  return standings;
};

export default useStandings;
