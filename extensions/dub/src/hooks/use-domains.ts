import { useCachedPromise } from "@raycast/utils";
import { getAllDomains } from "@/api";

export const useDomains = () => {
  const {
    data: domains,
    isLoading,
    error,
    mutate,
  } = useCachedPromise(getAllDomains, [], {
    initialData: [],
    failureToastOptions: { title: "❗ Failed to fetch domains" },
  });

  return { domains, mutate, isLoading: (!domains && !error) || isLoading, error };
};
