import { useCachedPromise } from "@raycast/utils";
import { getLinearClient } from "../api/linearClient";

export default function useCycles(teamId?: string, config?: { execute?: boolean }) {
  const { linearClient } = getLinearClient();

  const { data, error, isLoading } = useCachedPromise(
    async (teamId: string | undefined) => {
      const cycles = await linearClient.cycles({ filter: { team: { id: { eq: teamId } } } });

      // The cycles seem to be ordered from the furthest cycle to the closest cycle
      return cycles.nodes.sort((a, b) => a.number - b.number);
    },
    [teamId],
    { execute: config?.execute !== false && !!teamId },
  );

  return { cycles: data, cyclesError: error, isLoadingCycles: (!data && !error) || isLoading };
}
