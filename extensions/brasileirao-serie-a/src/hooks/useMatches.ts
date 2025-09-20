import { useFetch } from "@raycast/utils";
import { useMemo } from "react";
import { URL } from "url";
import { authHeaders, BASE_URL } from "../api";
import { useSeasons } from "./useSeasons";

interface Options {
  status: Status[];
  teamId: string;
}

const matchesURL = new URL(`${BASE_URL}/matches`);

export function useMatches(options: Options) {
  const [currentSeason] = useSeasons();
  matchesURL.searchParams.set("status", options.status.join(","));
  matchesURL.searchParams.set("season", currentSeason);
  const { data, isLoading, error } = useFetch<Matches>(matchesURL.toString(), {
    headers: authHeaders,
  });

  const matches = useMemo(() => {
    if (!data || error) {
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
