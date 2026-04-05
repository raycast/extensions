import { useCachedPromise } from "@raycast/utils";
import { getTeamTime } from "../api/time";
import { handleUseCachedPromiseError } from "../helpers/errors";

export function useTeamTime(from: string, to: string) {
  return useCachedPromise((f, t) => getTeamTime(f, t), [from, to], {
    onError: handleUseCachedPromiseError,
  });
}
