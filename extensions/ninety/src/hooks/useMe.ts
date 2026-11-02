import { useCachedPromise } from "@raycast/utils";
import { getCurrentUserId } from "../lib/me";
import { showError } from "../lib/errors";

export function useMe() {
  const { data, isLoading } = useCachedPromise(getCurrentUserId, [], {
    onError: (error) => showError(error, "Couldn't identify your Ninety user"),
  });
  return { userId: data, isLoading };
}
