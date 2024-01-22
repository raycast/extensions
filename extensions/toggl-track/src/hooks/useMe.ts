import { useSafeCachedPromise } from "./useSafeCachedPromise";
import { getMe } from "../api";

export function useMe() {
  const { data, error, isLoading, revalidate } = useSafeCachedPromise(getMe, [], {
    initialData: null,
  });
  return {
    me: data,
    meError: error,
    isLoadingMe: isLoading,
    revalidateMe: revalidate,
  };
}
