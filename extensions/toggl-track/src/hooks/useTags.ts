import { useCachedPromise } from "@raycast/utils";
import { getWorkspaceTags, Workspace } from "../api";
import { allWorkspacesFetch } from "../helpers/allWorkspacesFetch";

export function useTags(workspaces: Workspace[], initialExecute = true) {
  const { data, error, isLoading, revalidate } = useCachedPromise(getTags, [workspaces], {
    initialData: [],
    execute: initialExecute,
  });
  return {
    tags: data,
    tagsError: error,
    isLoadingTags: isLoading,
    revalidateTags: revalidate,
  };
}

function getTags(workspaces: Workspace[]) {
  return allWorkspacesFetch(getWorkspaceTags, workspaces);
}
