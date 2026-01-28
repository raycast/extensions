import { useCachedPromise } from "@raycast/utils";
import { getWorkspaces } from "../api/workspaces";
import { handleUseCachedPromiseError } from "../helpers/errors";

export function useWorkspaces() {
  return useCachedPromise(getWorkspaces, [], {
    onError(error) {
      handleUseCachedPromiseError(error);
    },
  });
}
