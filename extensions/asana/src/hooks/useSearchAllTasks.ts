import { useCachedPromise } from "@raycast/utils";
import { searchAllTasks } from "../api/tasks";
import { handleUseCachedPromiseError } from "../helpers/errors";

export function useSearchAllTasks(workspace: string, query: string) {
  return useCachedPromise((ws, q) => searchAllTasks(ws, q), [workspace, query], {
    execute: !!workspace && query.length > 0,
    onError(error) {
      handleUseCachedPromiseError(error);
    },
  });
}
