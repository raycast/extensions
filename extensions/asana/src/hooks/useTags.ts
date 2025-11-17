import { useCachedPromise } from "@raycast/utils";
import { getTagsForWorkspace } from "../api/tags";
import { handleUseCachedPromiseError } from "../helpers/errors";

export function useTags(workspaceGid: string | undefined) {
  return useCachedPromise(getTagsForWorkspace, [workspaceGid as string], {
    execute: !!workspaceGid,
    onError(error) {
      handleUseCachedPromiseError(error);
    },
  });
}
