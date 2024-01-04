import { useCachedPromise } from "@raycast/utils";
import { getTasks, Workspace } from "../api";
import { allWorkspacesFetch } from "../helpers/allWorkspacesFetch";

export function useTasks(workspaces: Workspace[], initialExecute = true) {
  const { data, error, isLoading, revalidate } = useCachedPromise(allWorkspacesFetch(getTasks), [workspaces], {
    initialData: [],
    execute: initialExecute,
  });
  return {
    tasks: data,
    tasksError: error,
    isLoadingTasks: isLoading,
    revalidateTasks: revalidate,
  };
}
