import { useCachedPromise } from "@raycast/utils";
import { getTags, Workspace } from "../api";
import { allWorkspacesFetch } from "../helpers/allWorkspacesFetch";

export function useTags(workspaces: Workspace[]) {
  const { data, error, isLoading, revalidate } = useCachedPromise(getAllTags, [workspaces], {
    initialData: [],
  });
  return {
    tags: data,
    tagsError: error,
    isLoadingTags: isLoading,
    revalidateTags: revalidate,
  };
}

function getAllTags(workspaces: Workspace[]) {
  return allWorkspacesFetch(getTags, workspaces);
}
