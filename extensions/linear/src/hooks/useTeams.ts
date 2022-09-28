import { useMemo } from "react";
import { useCachedPromise } from "@raycast/utils";

import { getTeams } from "../api/getTeams";

export default function useTeams() {
  const { data: teams, error, isLoading } = useCachedPromise(getTeams);

  const teamsWithCycles = useMemo(() => teams?.filter((team) => !!team.activeCycle), [teams]);
  const teamsWithProjects = useMemo(() => teams?.filter((team) => team.projects.nodes.length > 0), [teams]);

  return {
    teams,
    teamsError: error,
    isLoadingTeams: (!teams && !error) || isLoading,
    teamsWithCycles,
    teamsWithProjects,
  };
}
