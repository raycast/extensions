import { useCachedPromise } from "@raycast/utils";
import { getWorkspaces } from "../api";

export function useWorkspaces(initialExecute = true) {
  const { data, error, isLoading, revalidate } = useCachedPromise(getWorkspaces, [], {
    initialData: [],
    execute: initialExecute,
  });
  return {
    workspaces: data,
    workspacesError: error,
    isLoadingWorkspaces: isLoading,
    revalidateWorkspaces: revalidate,
  };
}
