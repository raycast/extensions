import { useCachedPromise } from "@raycast/utils";
import { getMyWorkspaces } from "../api";

export function useWorkspaces() {
  const { data, error, isLoading, revalidate } = useCachedPromise(getMyWorkspaces, [], { initialData: [] });
  return {
    workspaces: data,
    workspacesError: error,
    isLoadingWorkspaces: isLoading,
    revalidateWorkspaces: revalidate,
  };
}
