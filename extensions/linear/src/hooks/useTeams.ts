import { useCachedPromise } from "@raycast/utils";

import { getTeams } from "../api/getTeams";

export default function useTeams(query: string = "") {
  const { data: teams, error, isLoading } = useCachedPromise(getTeams, [query]);

  return {
    teams,
    teamsError: error,
    isLoadingTeams: (!teams && !error) || isLoading,
  };
}
