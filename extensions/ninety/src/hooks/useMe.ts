import { useCachedPromise } from "@raycast/utils";
import { getCurrentUserId } from "../lib/me";
import { showError } from "../lib/errors";

export function useMe(options: { execute?: boolean; silent?: boolean } = {}) {
  const { data, isLoading, error, revalidate } = useCachedPromise(getCurrentUserId, [], {
    execute: options.execute ?? true,
    onError: (error) => {
      if (!options.silent) showError(error, "Couldn't identify your Ninety user");
    },
  });
  return { userId: data, isLoading, error, revalidate };
}
