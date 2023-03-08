import { getProjects } from "../api/getProjects";
import { useCachedPromise } from "@raycast/utils";

export default function useProjects(teamId?: string, config?: { execute?: boolean }) {
  const { data, error, isLoading, mutate } = useCachedPromise(getProjects, [teamId], {
    execute: config?.execute !== false,
  });

  return {
    projects: data,
    isLoadingProjects: (!data && !error) || isLoading,
    projectsError: error,
    mutateProjects: mutate,
  };
}
