import { useCachedPromise } from "@raycast/utils";
import { getSubtasks } from "../api/tasks";
import { handleUseCachedPromiseError } from "../helpers/errors";

export function useSubtasks(taskId: string | undefined) {
  return useCachedPromise((id) => getSubtasks(id), [taskId as string], {
    execute: !!taskId,
    onError(error) {
      handleUseCachedPromiseError(error);
    },
  });
}
