import { useCachedPromise } from "@raycast/utils";
import { checkSmitheryOrThrow } from "../utils/env";

export function useSmitheryCheck() {
  const { isLoading, error, revalidate } = useCachedPromise(
    checkSmitheryOrThrow,
    [],
    {
      keepPreviousData: true,
    },
  );

  return {
    isLoading,
    error,
    retry: revalidate,
  };
}
