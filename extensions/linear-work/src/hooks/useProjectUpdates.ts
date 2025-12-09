import { useCachedPromise } from "@raycast/utils";

import { getProjectUpdates } from "../api/getProjects";

export default function useProjectUpdates(projectId: string) {
  const { data, error, isLoading, mutate } = useCachedPromise(getProjectUpdates, [projectId]);

  return { updates: data, updatesError: error, isLoadingUpdates: isLoading, mutateUpdates: mutate };
}
