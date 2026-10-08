import { useFetch } from "@raycast/utils";
import { useMemo } from "react";
import { authHeaders, BASE_URL } from "../api";

export function useLeagueInfo() {
  const { data } = useFetch<LeagueInfo>(BASE_URL, {
    headers: authHeaders,
  });

  const leagueInfo = useMemo(() => {
    const today = new Date();
    if (!data) {
      return { currentMatchday: 1, endDate: today.toISOString(), previousMatchday: 1 };
    }

    return { ...data.currentSeason, previousMatchday: Math.max(data.currentSeason.currentMatchday - 1, 1) };
  }, [data]);

  return leagueInfo;
}
