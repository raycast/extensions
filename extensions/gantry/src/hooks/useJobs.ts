import { useCachedPromise } from "@raycast/utils";
import { collectJobs } from "../lib/data/collector";
import type { JobHealth } from "../lib/types";

export function useJobs(options?: {
  showAppleServices?: boolean;
  healthFilter?: JobHealth | "all";
}) {
  const { data, isLoading, revalidate, error } = useCachedPromise(
    collectJobs,
    [],
    {
      keepPreviousData: true,
    },
  );

  let filteredJobs = data ?? [];

  // Filter Apple services
  if (!options?.showAppleServices) {
    filteredJobs = filteredJobs.filter(
      (job) => !job.label.startsWith("com.apple."),
    );
  }

  // Filter by health
  if (options?.healthFilter && options.healthFilter !== "all") {
    filteredJobs = filteredJobs.filter(
      (job) => job.health === options.healthFilter,
    );
  }

  return { jobs: filteredJobs, isLoading, revalidate, error };
}
