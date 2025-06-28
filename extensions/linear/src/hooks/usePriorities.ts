import { useCachedPromise } from "@raycast/utils";

import { getLinearClient } from "../api/linearClient";

export default function usePriorities() {
  const { linearClient } = getLinearClient();

  const { data, error, isLoading } = useCachedPromise(() => linearClient.issuePriorityValues, [], { initialData: [] });

  return { priorities: data, prioritiesError: error, isLoadingPriorities: (!data && !error) || isLoading };
}
