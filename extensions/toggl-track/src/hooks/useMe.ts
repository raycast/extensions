import { useCachedPromise } from "@raycast/utils";
import { getMe } from "../api";

export function useMe() {
  const { data, error, isLoading, revalidate } = useCachedPromise(getMe, [], {
    initialData: null,
  });
  return {
    me: data,
    meError: error,
    isLoadingMe: isLoading,
    revalidateMe: revalidate,
  };
}
