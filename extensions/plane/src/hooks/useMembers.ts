import { useCachedPromise } from "@raycast/utils";
import { getProjectMembers } from "../api/members";

export function useProjectMembers(projectId: string, config: { execute?: boolean }) {
  const { data, error, isLoading, mutate } = useCachedPromise(
    (projectId: string) => getProjectMembers({ projectId }),
    [projectId],
    {
      execute: config.execute !== false,
    },
  );
  return {
    members: data || [],
    error,
    isLoading,
    mutate,
  };
}
