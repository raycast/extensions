import { useCachedPromise } from "@raycast/utils";
import { getMe } from "../api/getMe";

type UseMeProps = {
  options?: {
    execute?: boolean;
  };
};

export function useMe({ options }: UseMeProps = {}) {
  const { data, error, isLoading, revalidate } = useCachedPromise(() => getMe(), [], {
    execute: options?.execute !== false,
  });

  return {
    meData: data,
    meError: error,
    meIsLoading: isLoading,
    meRevalidate: revalidate,
  };
}
