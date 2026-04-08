import { useCachedPromise } from "@raycast/utils";
import { getPlanUsage } from "../lib/plan-usage";

export function usePlanUsage() {
  const { data, isLoading, revalidate, error } = useCachedPromise(
    getPlanUsage,
    [],
  );
  return {
    planUsage: data ?? null,
    isLoading,
    revalidate,
    error,
  };
}
