import { useEffect, useState } from "react";
import { getTables } from "../api";
import { Table } from "../types";

const useTables = (season: string) => {
  const [tables, setTables] = useState<Table[]>();

  useEffect(() => {
    if (season) {
      setTables(undefined);

      getTables(season).then((data) => {
        setTables(data);
      });
    }
  }, [season]);

  return tables;
};

export default useTables;
