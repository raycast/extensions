import { useCachedPromise } from "@raycast/utils";

import { getLinearClient } from "../api/linearClient";

export default function useStates(teamId?: string, config?: { execute?: boolean }) {
  const { linearClient } = getLinearClient();

  const {
    data: states,
    error: statesError,
    isLoading: isLoadingStates,
  } = useCachedPromise(
    async (teamId: string | undefined) => {
      const states = await linearClient.workflowStates({ filter: { team: { id: { eq: teamId } } } });
      return states.nodes.sort((a, b) => a.position - b.position);
    },
    [teamId],
    {
      initialData: [],
      execute: config?.execute !== false,
    },
  );

  return { states, isLoadingStates, statesError };
}
