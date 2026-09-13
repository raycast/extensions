import { useCachedPromise } from "@raycast/utils";

import { getProjectUpdates } from "../api/getProjects";
import { useWorkspaces } from "../components/WorkspaceContext";

export default function useProjectUpdates(projectId: string) {
  const { workspaceKey } = useWorkspaces();
  const { data, error, isLoading, mutate } = useCachedPromise(
    (key: string, projectId: string) => getProjectUpdates(projectId),
    [workspaceKey, projectId],
  );

  return { updates: data, updatesError: error, isLoadingUpdates: isLoading, mutateUpdates: mutate };
}
