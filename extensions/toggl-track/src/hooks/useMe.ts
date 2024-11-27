import { getMe } from "@/api";
import { useSafeCachedPromise } from "@/hooks/useSafeCachedPromise";

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
