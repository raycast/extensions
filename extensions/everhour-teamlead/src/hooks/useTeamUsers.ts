import { useCachedPromise } from "@raycast/utils";
import { getTeamUsers } from "../api/users";
import { handleUseCachedPromiseError } from "../helpers/errors";

export function useTeamUsers() {
  return useCachedPromise(() => getTeamUsers(), [], {
    onError: handleUseCachedPromiseError,
  });
}
