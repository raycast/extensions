import { useCachedPromise } from "@raycast/utils";
import { getPreferenceValues } from "@raycast/api";
import { getMyTasks } from "../api/tasks";
import { handleUseCachedPromiseError } from "../helpers/errors";

const { showCompletedTasks } = getPreferenceValues<Preferences.MyTasks>();

export function useMyTasks(workspace?: string, query?: string) {
  return useCachedPromise((workspace, query) => getMyTasks(workspace, showCompletedTasks, query), [workspace, query], {
    execute: !!workspace,
    keepPreviousData: true,
    onError(error) {
      handleUseCachedPromiseError(error);
    },
  });
}
