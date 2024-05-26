import { useSafeCachedPromise } from "./useSafeCachedPromise";
import { getMyWorkspaces } from "../api";

export function useWorkspaces() {
  const { data, error, isLoading, revalidate } = useSafeCachedPromise(getMyWorkspaces, [], { initialData: [] });
  return {
    workspaces: data,
    workspacesError: error,
    isLoadingWorkspaces: isLoading,
    revalidateWorkspaces: revalidate,
  };
}
