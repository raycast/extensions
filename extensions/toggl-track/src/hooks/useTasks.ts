import { useCachedPromise } from "@raycast/utils";
import { getTasks, Workspace } from "../api";
import { allWorkspacesFetch } from "../helpers/allWorkspacesFetch";

export function useTasks(workspaces: Workspace[]) {
  const { data, error, isLoading, revalidate } = useCachedPromise(getAllTasks, [workspaces], {
    initialData: [],
  });
  return {
    tasks: data,
    tasksError: error,
    isLoadingTasks: isLoading,
    revalidateTasks: revalidate,
  };
}

function getAllTasks(workspaces: Workspace[]) {
  return allWorkspacesFetch(getTasks, workspaces);
}
