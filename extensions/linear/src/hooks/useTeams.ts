import { useCachedPromise } from "@raycast/utils";

import { getTeams } from "../api/getTeams";

export default function useTeams(query: string = "") {
  const { data, error, isLoading } = useCachedPromise(getTeams, [query]);

  return {
    teams: data?.teams,
    org: data?.organization,
    teamsError: error,
    isLoadingTeams: (!data && !error) || isLoading,
    supportsTeamTypeahead: query.trim().length > 0 || data?.hasMoreTeams,
  };
}
