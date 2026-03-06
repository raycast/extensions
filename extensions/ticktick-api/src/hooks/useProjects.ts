import { useCachedPromise } from "@raycast/utils";
import { getProjects } from "../api";

export function useProjects() {
  const { data, isLoading, revalidate, error } = useCachedPromise(
    getProjects,
    [],
    {
      keepPreviousData: true,
    },
  );

  return {
    projects: data ?? [],
    isLoading,
    revalidate,
    error,
  };
}
