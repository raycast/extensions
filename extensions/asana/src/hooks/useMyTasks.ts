import { useCachedPromise } from "@raycast/utils";
import { getPreferenceValues } from "@raycast/api";
import { getMyTasks } from "../api/tasks";
import { handleUseCachedPromiseError } from "../helpers/errors";

type PreferencesValues = {
  showCompletedTasks: boolean;
};

const { showCompletedTasks } = getPreferenceValues<PreferencesValues>();

export function useMyTasks(workspace?: string) {
  return useCachedPromise((workspace) => getMyTasks(workspace, showCompletedTasks), [workspace], {
    execute: !!workspace,
    onError(error) {
      handleUseCachedPromiseError(error);
    },
  });
}
