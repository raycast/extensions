import { useCachedPromise } from "@raycast/utils";

import { getLinearClient } from "../api/linearClient";
import { useWorkspaces } from "../components/WorkspaceContext";

export default function useMe() {
  const { linearClient } = getLinearClient();
  const { workspaceKey } = useWorkspaces();
  const { data, error, isLoading } = useCachedPromise(
    (key: string) => {
      void key;
      return linearClient.viewer;
    },
    [workspaceKey],
  );

  return { me: data, meError: error, isLoadingMe: (!data && !error) || isLoading };
}
