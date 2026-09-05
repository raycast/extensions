import { useCachedPromise } from "@raycast/utils";

import { getTeams } from "../api/getTeams";
import { useWorkspaces } from "../components/WorkspaceContext";

export default function useTeams(query: string = "") {
  const { workspaceKey } = useWorkspaces();
  const { data, error, isLoading } = useCachedPromise(
    (key: string, query: string) => getTeams(query),
    [workspaceKey, query],
  );

  return {
    teams: data?.teams,
    org: data?.organization,
    teamsError: error,
    isLoadingTeams: (!data && !error) || isLoading,
    supportsTeamTypeahead: query.trim().length > 0 || data?.hasMoreTeams,
  };
}
