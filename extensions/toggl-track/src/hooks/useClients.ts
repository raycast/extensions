import { useCachedPromise } from "@raycast/utils";
import { getWorkspaceClients, Workspace } from "../api";
import { allWorkspacesFetch } from "../helpers/allWorkspacesFetch";

export function useClients(workspaces: Workspace[], initialExecute = true) {
  const { data, error, isLoading, revalidate } = useCachedPromise(getClients, [workspaces], {
    initialData: [],
    execute: initialExecute,
  });
  return {
    clients: data,
    clientsError: error,
    isLoadingClients: isLoading,
    revalidateClients: revalidate,
  };
}

function getClients(workspaces: Workspace[]) {
  return allWorkspacesFetch(getWorkspaceClients, workspaces);
}
