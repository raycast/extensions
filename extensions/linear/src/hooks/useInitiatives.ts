import { useCachedPromise } from "@raycast/utils";

import { getInitiatives } from "../tools/get-initiatives";

export function useInitiatives() {
  const { data, error, isLoading, mutate } = useCachedPromise(getInitiatives, [], {
    failureToastOptions: { title: "Failed to load initiatives" },
    keepPreviousData: true,
  });

  return {
    initiatives: data,
    initiativesError: error,
    isLoadingInitiatives: (!data && !error) || isLoading,
    mutateInitiatives: mutate,
  };
}
