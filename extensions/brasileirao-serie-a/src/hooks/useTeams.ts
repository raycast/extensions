import { useFetch } from "@raycast/utils";
import { useMemo } from "react";
import { authHeaders, BASE_URL } from "../api";

export function useTeams() {
  const { data, isLoading } = useFetch<Teams>(`${BASE_URL}/teams`, {
    headers: authHeaders,
  });

  const teams = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.teams.sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  return [teams, isLoading] as const;
}
