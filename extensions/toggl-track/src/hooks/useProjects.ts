import { useCachedPromise } from "@raycast/utils";
import { getWorkspaceProjects, Workspace } from "../api";
import { allWorkspacesFetch } from "../helpers/allWorkspacesFetch";

export function useProjects(workspaces: Workspace[]) {
  const { data, error, isLoading, revalidate } = useCachedPromise(getProjects, [workspaces], {
    initialData: [],
  });

  return {
    projects: data,
    projectsError: error,
    isLoadingProjects: isLoading,
    revalidateProjects: revalidate,
  };
}

function getProjects(workspaces: Workspace[]) {
  return allWorkspacesFetch(getWorkspaceProjects, workspaces);
}
