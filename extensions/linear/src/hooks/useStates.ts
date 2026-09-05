import { useCachedPromise } from "@raycast/utils";

import { getLinearClient } from "../api/linearClient";
import { useWorkspaces } from "../components/WorkspaceContext";

export default function useStates(teamId?: string, config?: { execute?: boolean }) {
  const { linearClient } = getLinearClient();
  const { workspaceKey } = useWorkspaces();

  const {
    data: states,
    error: statesError,
    isLoading: isLoadingStates,
  } = useCachedPromise(
    async (key: string, teamId: string | undefined) => {
      const states = await linearClient.workflowStates({ filter: { team: { id: { eq: teamId } } } });
      return states.nodes.sort((a, b) => a.position - b.position);
    },
    [workspaceKey, teamId],
    {
      initialData: [],
      execute: config?.execute !== false,
    },
  );

  return { states, isLoadingStates, statesError };
}
