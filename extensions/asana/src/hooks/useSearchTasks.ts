import { useCachedPromise } from "@raycast/utils";
import { searchTasks } from "../api/tasks";
import { handleUseCachedPromiseError } from "../helpers/errors";

export function useSearchTasks(workspace: string, query: string) {
  return useCachedPromise((ws, q) => searchTasks(ws, q), [workspace, query], {
    execute: !!workspace,
    onError(error) {
      handleUseCachedPromiseError(error);
    },
  });
}
