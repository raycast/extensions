import { useCachedPromise } from "@raycast/utils";
import { getProjects, Workspace } from "../api";
import { allWorkspacesFetch } from "../helpers/allWorkspacesFetch";

export function useProjects(workspaces: Workspace[]) {
  const { data, error, isLoading, revalidate } = useCachedPromise(getAllProjects, [workspaces], {
    initialData: [],
  });

  return {
    projects: data,
    projectsError: error,
    isLoadingProjects: isLoading,
    revalidateProjects: revalidate,
  };
}

function getAllProjects(workspaces: Workspace[]) {
  return allWorkspacesFetch(getProjects, workspaces);
}
