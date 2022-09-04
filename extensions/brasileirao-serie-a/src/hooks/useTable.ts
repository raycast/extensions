import { useFetch } from "@raycast/utils";
import { useMemo } from "react";
import { authHeaders, BASE_URL } from "../api";
import { usePreviousTable } from "./usePreviousTable";

export function useTable() {
  const { data, isLoading } = useFetch<Standings>(`${BASE_URL}/standings`, {
    headers: authHeaders,
  });

  const previousTable = usePreviousTable();

  const table = useMemo(() => {
    if (!data) {
      return [];
    }

    const standings = data.standings.find((standing) => standing.type === "TOTAL");
    if (!standings) {
      return [];
    }

    return standings.table.map((table) => {
      const previous = previousTable.find((p) => p.team.id === table.team.id);

      return {
        ...table,
        previousPosition: previous?.position,
      };
    });
  }, [data, previousTable]);

  return [table, isLoading] as const;
}
