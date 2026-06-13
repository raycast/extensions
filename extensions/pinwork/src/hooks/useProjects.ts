/**
 * Hook to fetch projects with caching.
 */

import { useCachedPromise } from "@raycast/utils";
import { getProjects } from "../api/pinwork";

export function useProjects(options?: { execute?: boolean }) {
  const { data, isLoading, error, revalidate, mutate } = useCachedPromise(
    getProjects,
    [],
    {
      initialData: [],
      keepPreviousData: true,
      execute: options?.execute ?? true,
    },
  );

  const activeProjects = data.filter((project) => !project.isArchived);
  const archivedProjects = data.filter((project) => project.isArchived);

  return {
    projects: data,
    activeProjects,
    archivedProjects,
    isLoading,
    error,
    revalidate,
    mutate,
  };
}
