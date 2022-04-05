import { useEffect, useState } from "react";
import { getTable } from "../api";
import { Entry } from "../types/firebase";

export const useTable = (competition: string) => {
  const [table, setTable] = useState<Entry[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    setLoading(true);
    setTable([]);

    getTable(competition).then((data) => {
      setTable(data);
      setLoading(false);
    });
  }, [competition]);

  return { table, loading };
};
