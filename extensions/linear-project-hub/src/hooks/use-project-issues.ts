import { useCachedPromise } from "@raycast/utils";

import { getProjectIssues } from "../api/project-issues";

export function useProjectIssues(projectId: string) {
  const { data, isLoading, revalidate } = useCachedPromise(getProjectIssues, [projectId]);

  return {
    issues: data ?? [],
    isLoadingIssues: isLoading,
    revalidateIssues: revalidate,
  };
}
