import { useCachedPromise } from "@raycast/utils";

import { getProjectDetail } from "../api/projects";

export function useProjectDetail(projectId: string) {
  const { data, isLoading, revalidate } = useCachedPromise(getProjectDetail, [projectId]);

  return {
    project: data ?? null,
    isLoadingProject: isLoading,
    revalidateProject: revalidate,
  };
}
