import { useCachedPromise } from "@raycast/utils";

import { getMilestones } from "../api/getMilestones";
import { useWorkspaces } from "../components/WorkspaceContext";

export default function useMilestones(projectId?: string, config?: { execute?: boolean }) {
  const { workspaceKey } = useWorkspaces();
  const { data, error, isLoading, mutate } = useCachedPromise(
    (key: string, projectId?: string) => getMilestones(projectId),
    [workspaceKey, projectId],
    {
      execute: config?.execute !== false,
    },
  );

  return {
    milestones: data,
    isLoadingMilestones: (!data && !error) || isLoading,
    milestonesError: error,
    mutateMilestones: mutate,
  };
}
