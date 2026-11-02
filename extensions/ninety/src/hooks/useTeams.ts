import { useCachedPromise } from "@raycast/utils";
import { getAvailableTeams } from "../api/ninety";
import { showError } from "../lib/errors";

/** Teams the user can read and create work for; the ones they belong to come first. */
export function useTeams() {
  const { data, isLoading, error, revalidate } = useCachedPromise(
    async () => {
      const teams = await getAvailableTeams();
      return [...(teams ?? [])].sort((a, b) => Number(b.isMember) - Number(a.isMember) || a.name.localeCompare(b.name));
    },
    [],
    { onError: (error) => showError(error, "Couldn't load Teams") },
  );
  const teams = data ?? [];
  const teamName = (teamId?: string) => teams.find((team) => team._id === teamId)?.name;
  return { teams, teamName, isLoading, error, revalidate };
}
