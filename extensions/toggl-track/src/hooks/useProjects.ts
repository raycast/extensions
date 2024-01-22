import { useCachedPromise } from "@raycast/utils";
import { getMyProjects } from "../api";

export function useProjects() {
  const { data, error, isLoading, revalidate } = useCachedPromise(getMyProjects, [], { initialData: [] });

  return {
    projects: data,
    projectsError: error,
    isLoadingProjects: isLoading,
    revalidateProjects: revalidate,
  };
}
