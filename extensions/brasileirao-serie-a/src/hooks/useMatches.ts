import { useFetch } from "@raycast/utils";
import { useMemo } from "react";
import { URLSearchParams } from "url";
import { authHeaders, BASE_URL } from "../api";

interface Options {
  status: Status[];
  teamId: string;
}

export function useMatches(options: Options) {
  const params = new URLSearchParams({ status: options.status.join(",") });
  const { data, isLoading } = useFetch<Matches>(`${BASE_URL}/matches?${params.toString()}`, {
    headers: authHeaders,
  });

  const matches = useMemo(() => {
    if (!data) {
      return [];
    }

    const { teamId } = options;
    if (teamId !== "-1") {
      return data.matches.filter((match) => [match.homeTeam.id, match.awayTeam.id].includes(+teamId));
    }

    return data.matches;
  }, [data, options.teamId]);

  return [matches, isLoading] as const;
}
