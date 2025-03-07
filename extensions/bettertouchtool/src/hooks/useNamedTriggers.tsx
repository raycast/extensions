import { useCachedPromise, useFrecencySorting } from "@raycast/utils";
import { getNamedTriggers } from "../api";
import { NamedTrigger } from "../types";

export function useNamedTriggers(showAllTriggers: boolean) {
  const {
    data: namedTriggersResult,
    isLoading,
    revalidate,
  } = useCachedPromise(getNamedTriggers, [], {
    keepPreviousData: true,
  });

  const {
    data: filteredTriggers,
    error,
    isLoading: filterLoading,
  } = useCachedPromise(
    async (result: typeof namedTriggersResult, showAllTriggers: boolean) => {
      if (!result) {
        throw new Error("No result found.");
      }
      if (result.status === "error") {
        throw new Error(result.error);
      }
      return result.data.filter((trigger: NamedTrigger) => showAllTriggers || trigger.enabled);
    },
    [namedTriggersResult, showAllTriggers],
    {
      execute: !isLoading && namedTriggersResult !== undefined,
      keepPreviousData: true,
    },
  );
  const { data, visitItem } = useFrecencySorting(filteredTriggers || [], {
    namespace: "named-triggers",
    key: (x) => x.uuid,
  });
  return {
    data: error ? undefined : { namedTriggers: data, visitItem },
    isLoading: isLoading || filterLoading,
    error: error?.message,
    refresh: revalidate,
  };
}
