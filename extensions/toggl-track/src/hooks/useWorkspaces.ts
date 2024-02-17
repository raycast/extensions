import { useCachedPromise } from "@raycast/utils";
import { getWorkspaces } from "../api";

export function useWorkspaces() {
  const { data, error, isLoading, revalidate } = useCachedPromise(getWorkspaces, [], {
    initialData: [],
  });
  return {
    workspaces: data,
    workspacesError: error,
    isLoadingWorkspaces: isLoading,
    revalidateWorkspaces: revalidate,
  };
}
