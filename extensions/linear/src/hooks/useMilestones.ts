import { getLinearClient } from "../helpers/withLinearClient";
import { useCachedPromise } from "@raycast/utils";

export default function usePriorities() {
  const { linearClient } = getLinearClient();

  const { data, error, isLoading } = useCachedPromise(async () => {
    const milestones = await linearClient.milestones();
    return milestones.nodes;
  });

  return { milestones: data, milestonesError: error, isLoadingMilestones: isLoading };
}
