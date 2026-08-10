import { useFetch } from "@raycast/utils";
import { useMemo } from "react";
import { authHeaders, BASE_URL } from "../api";

const SHORT_NAMES = {
  ACG: "Atlético-GO",
  AMÉ: "América-MG",
  CUI: "Cuiabá",
  CAM: "Atlético-MG",
  CAP: "Athletico-PR",
} as Record<Team["tla"], string>;

export function getTeamShortName(team: Pick<Team, "tla" | "shortName">): string {
  return SHORT_NAMES[team.tla] ?? team.shortName;
}

export function useTeams() {
  const { data, isLoading } = useFetch<Teams>(`${BASE_URL}/teams`, {
    headers: authHeaders,
  });

  const teams = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.teams
      .map((team) => {
        return { ...team, shortName: getTeamShortName(team) };
      })
      .sort((a, b) => a.shortName.localeCompare(b.shortName));
  }, [data]);

  return [teams, isLoading] as const;
}
