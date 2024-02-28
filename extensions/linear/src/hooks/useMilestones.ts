import { getMilestones } from "../api/getMilestones";
import { useCachedPromise } from "@raycast/utils";

export default function useMilestones(projectId?: string, config?: { execute?: boolean }) {
  const { data, error, isLoading, mutate } = useCachedPromise(getMilestones, [projectId], {
    execute: config?.execute !== false,
  });

  return {
    milestones: data,
    isLoadingMilestones: (!data && !error) || isLoading,
    milestonesError: error,
    mutateMilestones: mutate,
  };
}
