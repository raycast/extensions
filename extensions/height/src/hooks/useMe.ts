import { useCachedPromise } from "@raycast/utils";
import { ApiUser } from "../api/user";
import { UseCachedPromiseOptions } from "../types/utils";

type Props = {
  options?: UseCachedPromiseOptions<typeof ApiUser.getMe>;
};

export default function useMe({ options }: Props = {}) {
  const { data, error, isLoading, mutate } = useCachedPromise(ApiUser.getMe, [], {
    ...options,
  });

  return {
    meData: data,
    meError: error,
    meIsLoading: isLoading,
    meMutate: mutate,
  };
}
