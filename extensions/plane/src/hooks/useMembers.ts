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
  const filteredMembers = data?.filter(
    (member) => !member.email?.endsWith("-intake@plane.so") && !member.email?.endsWith("_bot@plane.so"),
  );

  return {
    members: filteredMembers || [],
    error,
    isLoading,
    mutate,
  };
}
