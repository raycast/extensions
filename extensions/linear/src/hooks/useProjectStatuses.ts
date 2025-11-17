import { useCachedPromise } from "@raycast/utils";

import { getLinearClient } from "../api/linearClient";

export default function useProjectStatuses() {
  const { linearClient } = getLinearClient();
  const { data: states, isLoading: isLoadingStates } = useCachedPromise(async () => {
    const states = await linearClient.projectStatuses();
    return states.nodes.sort((a, b) => a.position - b.position);
  });

  return { states, isLoadingStates };
}
