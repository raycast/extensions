import { getLabels } from "../api/getLabels";
import { useCachedPromise } from "@raycast/utils";

export default function useLabels(teamId?: string, config?: { execute?: boolean }) {
  const { data, error, isLoading } = useCachedPromise(getLabels, [teamId], {
    execute: config?.execute !== false && !!teamId,
  });

  return { labels: data, labelsError: error, isLoadingLabels: (!data && !error) || isLoading };
}
