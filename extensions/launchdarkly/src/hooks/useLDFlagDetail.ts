import { useCachedPromise } from "@raycast/utils";
import { fetchFlag } from "../api/endpoints";

/** Full flag configuration for every environment (the list endpoint omits environments). */
export function useLDFlagDetail(projectKey: string, flagKey: string) {
  const { data, isLoading, error, revalidate } = useCachedPromise(fetchFlag, [projectKey, flagKey], {
    failureToastOptions: { title: "Error fetching flag details" },
  });
  return { data, isLoading, error, revalidate };
}
