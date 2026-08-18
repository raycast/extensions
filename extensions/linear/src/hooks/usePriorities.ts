import { useCachedPromise } from "@raycast/utils";

import { getLinearClient } from "../api/linearClient";
import { useWorkspaces } from "../components/WorkspaceContext";

export default function usePriorities() {
  const { linearClient } = getLinearClient();
  const { workspaceKey } = useWorkspaces();

  const { data, error, isLoading } = useCachedPromise(
    (key: string) => {
      void key;
      return linearClient.issuePriorityValues;
    },
    [workspaceKey],
    { initialData: [] },
  );

  return { priorities: data, prioritiesError: error, isLoadingPriorities: (!data && !error) || isLoading };
}
