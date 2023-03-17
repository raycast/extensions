import { useFetch } from "@raycast/utils";
import { ApiHeaders, ApiUrls } from "../api/helpers";
import { UserObject } from "../types/user";

type Props = {
  options?: Parameters<typeof useFetch<UserObject>>[1];
};

export default function useMe({ options }: Props = {}) {
  const { data, error, isLoading, mutate } = useFetch<UserObject>(ApiUrls.me, {
    headers: ApiHeaders,
    ...options,
  });

  return {
    meData: data,
    meError: error,
    meIsLoading: isLoading,
    meMutate: mutate,
  };
}
