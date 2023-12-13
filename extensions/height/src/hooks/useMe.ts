import { useCachedPromise } from "@raycast/utils";
import { getMe } from "../api/user";
import { UseCachedPromiseOptions } from "../types/utils";

type Props = {
  options?: UseCachedPromiseOptions<typeof getMe>;
};

export default function useMe({ options }: Props = {}) {
  const { data, error, isLoading, mutate } = useCachedPromise(getMe, [], {
    ...options,
  });

  return {
    meData: data,
    meError: error,
    meIsLoading: isLoading,
    meMutate: mutate,
  };
}
