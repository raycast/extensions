import { useEffect, useState } from "react";
import { getTable } from "../api";
import { Entry } from "../types/firebase";

export const useTable = (competition: string) => {
  const [table, setTable] = useState<Entry[]>();

  useEffect(() => {
    setTable(undefined);

    getTable(competition).then((data) => {
      setTable(data);
    });
  }, [competition]);

  return table;
};
