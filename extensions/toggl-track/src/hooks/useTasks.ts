import { useCachedPromise } from "@raycast/utils";
import { getWorkspaceTasks, Workspace } from "../api";
import { allWorkspacesFetch } from "../helpers/allWorkspacesFetch";

export function useTasks(workspaces: Workspace[]) {
  const { data, error, isLoading, revalidate } = useCachedPromise(getTasks, [workspaces], {
    initialData: [],
  });
  return {
    tasks: data,
    tasksError: error,
    isLoadingTasks: isLoading,
    revalidateTasks: revalidate,
  };
}

function getTasks(workspaces: Workspace[]) {
  return allWorkspacesFetch(getWorkspaceTasks, workspaces);
}
