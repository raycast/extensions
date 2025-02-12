import { useCachedPromise } from "@raycast/utils";
import { getUsers } from "../api/users";
import { handleUseCachedPromiseError } from "../helpers/errors";

export function useUsers(workspace?: string, config?: { execute?: boolean }) {
  return useCachedPromise((workspace) => getUsers(workspace), [workspace], {
    execute: config?.execute !== false && !!workspace,
    onError(error) {
      handleUseCachedPromiseError(error);
    },
  });
}
