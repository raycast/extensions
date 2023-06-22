import { useFetch } from "@raycast/utils";
import { URL } from "node:url";
import { useMemo } from "react";
import { authHeaders, BASE_URL } from "../api";
import { usePreviousTable } from "./usePreviousTable";
import { useTeams } from "./useTeams";

const standingsURL = new URL(`${BASE_URL}/standings`);

export function useTable(season: string) {
  standingsURL.searchParams.set("season", season);
  const { data, isLoading, error } = useFetch<Standings>(standingsURL.toString(), {
    headers: authHeaders,
  });

  const previousTable = usePreviousTable(season);
  const [teams] = useTeams();

  const table = useMemo(() => {
    if (!data || error) {
      return [];
    }

    const standings = data.standings.find((standing) => standing.type === "TOTAL");
    if (!standings) {
      return [];
    }

    return standings.table.map((table) => {
      const previous = previousTable.find((p) => p.team.id === table.team.id);
      const team = teams.find((t) => t.id === table.team.id) ?? table.team;

      return {
        ...table,
        team,
        previousPosition: previous?.position,
      };
    });
  }, [data, previousTable, teams]);

  return [table, isLoading] as const;
}
