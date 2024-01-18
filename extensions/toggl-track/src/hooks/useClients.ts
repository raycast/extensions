import { useCachedPromise } from "@raycast/utils";
import { getClients, Workspace } from "../api";
import { allWorkspacesFetch } from "../helpers/allWorkspacesFetch";

export function useClients(workspaces: Workspace[]) {
  const { data, error, isLoading, revalidate } = useCachedPromise(getAllClients, [workspaces], {
    initialData: [],
  });
  return {
    clients: data,
    clientsError: error,
    isLoadingClients: isLoading,
    revalidateClients: revalidate,
  };
}

function getAllClients(workspaces: Workspace[]) {
  return allWorkspacesFetch(getClients, workspaces);
}
