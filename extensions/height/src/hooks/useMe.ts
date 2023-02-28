import { useFetch } from "@raycast/utils";
import { ApiUrls } from "../api/helpers";
import { getOAuthToken } from "../components/withHeightAuth";
import { UserObject } from "../types/user";

type Props = {
  options?: Parameters<typeof useFetch<UserObject>>[1];
};

export default function useMe({ options }: Props = {}) {
  const { data, error, isLoading, mutate } = useFetch<UserObject>(ApiUrls.me, {
    headers: {
      Authorization: `api-key ${getOAuthToken()}`,
      "Content-Type": "application/json",
    },
    ...options,
  });

  return {
    meData: data,
    meError: error,
    meIsLoading: isLoading,
    meMutate: mutate,
  };
}
