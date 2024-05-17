import { getMyProjects } from "@/api";
import { useSafeCachedPromise } from "@/hooks/useSafeCachedPromise";

export function useProjects() {
  const { data, error, isLoading, revalidate } = useSafeCachedPromise(getMyProjects, [], { initialData: [] });

  return {
    projects: data,
    projectsError: error,
    isLoadingProjects: isLoading,
    revalidateProjects: revalidate,
  };
}
