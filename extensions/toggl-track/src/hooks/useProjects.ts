import { useSafeCachedPromise } from "./useSafeCachedPromise";
import { getMyProjects } from "../api";

export function useProjects() {
  const { data, error, isLoading, revalidate } = useSafeCachedPromise(getMyProjects, [], { initialData: [] });

  return {
    projects: data,
    projectsError: error,
    isLoadingProjects: isLoading,
    revalidateProjects: revalidate,
  };
}
