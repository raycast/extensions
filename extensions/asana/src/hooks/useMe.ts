import { useCachedPromise } from "@raycast/utils";
import { getMe } from "../api/users";
import { handleUseCachedPromiseError } from "../helpers/errors";

export function useMe() {
  return useCachedPromise(getMe, [], {
    onError(error) {
      handleUseCachedPromiseError(error);
    },
  });
}
