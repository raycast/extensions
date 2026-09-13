import { useCachedPromise } from "@raycast/utils";

import { getLinearClient } from "../api/linearClient";
import { useWorkspaces } from "../components/WorkspaceContext";

export default function useProjectStatuses() {
  const { linearClient } = getLinearClient();
  const { workspaceKey } = useWorkspaces();
  const { data: states, isLoading: isLoadingStates } = useCachedPromise(
    async (key: string) => {
      void key;
      const states = await linearClient.projectStatuses();
      return states.nodes.sort((a, b) => a.position - b.position);
    },
    [workspaceKey],
  );

  return { states, isLoadingStates };
}
