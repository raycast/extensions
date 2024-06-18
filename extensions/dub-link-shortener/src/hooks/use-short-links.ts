import { useCachedPromise } from "@raycast/utils";
import { getAllShortLinks } from "@/api";
import { WorkspaceId } from "@/types";

export const useShortLinks = ({ workspaceId, workspacesError }: WorkspaceId & { workspacesError?: Error }) => {
  const {
    data: shortLinks,
    isLoading,
    error,
    mutate,
  } = useCachedPromise(getAllShortLinks, [{ workspaceId }], {
    initialData: [],
    execute: workspaceId.length > 0 && !workspacesError,
    failureToastOptions: { title: "❗ Failed to fetch short links" },
  });

  return { shortLinks, mutate, isLoading: (!shortLinks && !error) || isLoading, error };
};
