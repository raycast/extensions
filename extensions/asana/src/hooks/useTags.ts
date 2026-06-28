import { useCachedPromise } from "@raycast/utils";
import { getTagsForWorkspace } from "../api/tags";
import { handleUseCachedPromiseError } from "../helpers/errors";

export function useTags(workspaceGid: string | undefined, config?: { execute?: boolean }) {
  return useCachedPromise(getTagsForWorkspace, [workspaceGid as string], {
    execute: config?.execute !== false && !!workspaceGid,
    onError(error) {
      handleUseCachedPromiseError(error);
    },
  });
}
