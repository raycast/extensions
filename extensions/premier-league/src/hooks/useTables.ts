import { useEffect, useState } from "react";
import { getTables } from "../api";
import { Table } from "../types";

const useTables = (season: string) => {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (season) {
      setLoading(true);
      getTables(season).then((data) => {
        setTables(data);
        setLoading(false);
      });
    }
  }, [season]);

  return { tables, loading };
};

export default useTables;
