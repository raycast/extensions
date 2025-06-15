import { useEffect, useState } from "react";
import { getTable } from "../services/tableService";
import { Standing } from "../types";

const useTable = () => {
  const [standings, setStandings] = useState<Standing[]>();

  useEffect(() => {
    getTable().then((data) => {
      setStandings(data);
    });
  }, []);

  return standings;
};

export default useTable;
