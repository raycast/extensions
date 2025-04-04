import { getMyProjects } from "@/api";
import { useSafeCachedPromise } from "@/hooks/toggl/useSafeCachedPromise";

export function useProjects() {
  const { data, error, isLoading, revalidate } = useSafeCachedPromise(getMyProjects, [], { initialData: [] });

  return {
    projects: data,
    projectsError: error,
    isLoadingProjects: isLoading,
    revalidateProjects: revalidate,
  };
}
