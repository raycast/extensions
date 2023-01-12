import { useFetch } from "@raycast/utils";
import { useMemo } from "react";
import { URLSearchParams } from "url";
import { authHeaders, BASE_URL } from "../api";
import { useCurrentSeason } from "./useCurrentSeason";

export function usePreviousTable() {
  const currentSeason = useCurrentSeason();
  const params = new URLSearchParams({
    season: new Date(currentSeason.endDate).getFullYear().toString(),
    matchday: currentSeason.previousMatchday.toString(),
  });

  const { data } = useFetch<Standings>(`${BASE_URL}/standings?${params.toString()}`, {
    headers: authHeaders,
  });
  const table = useMemo(() => {
    if (!data) {
      return [];
    }

    const standings = data.standings.find((standing) => standing.type === "TOTAL");
    if (!standings) {
      return [];
    }

    return standings.table;
  }, [data]);

  return table;
}
