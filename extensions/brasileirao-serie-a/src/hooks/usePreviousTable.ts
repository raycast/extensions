import { useFetch } from "@raycast/utils";
import { useMemo } from "react";
import { URLSearchParams } from "url";
import { authHeaders, BASE_URL } from "../api";
import { useLeagueInfo } from "./useLeagueInfo";

export function usePreviousTable(season: string) {
  const leagueInfo = useLeagueInfo();
  const params = new URLSearchParams({
    season: season,
    matchday: leagueInfo.previousMatchday.toString(),
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
