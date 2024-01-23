import { useCachedPromise } from "@raycast/utils";
import { getMe } from "../api";

export function useMe(initialExecute = true) {
  const { data, error, isLoading, revalidate } = useCachedPromise(getMe, [], {
    initialData: null,
    execute: initialExecute,
  });
  return {
    me: data,
    meError: error,
    isLoadingMe: isLoading,
    revalidateMe: revalidate,
  };
}
