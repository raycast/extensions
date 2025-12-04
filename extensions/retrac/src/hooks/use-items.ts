import { useCachedPromise } from "@raycast/utils";
import { getAllItems } from "@/api";
import { WorkspaceId } from "@/types";

export const useItems = ({ workspaceId, workspacesError }: WorkspaceId & { workspacesError?: Error }) => {
  const {
    data: items,
    isLoading,
    error,
    mutate,
  } = useCachedPromise(getAllItems, [{ workspaceId }], {
    initialData: [],
    execute: workspaceId.length > 0 && !workspacesError,
    failureToastOptions: { title: "❗ Failed to fetch items" },
  });

  return { items, mutate, isLoading: (!items && !error) || isLoading, error };
};
