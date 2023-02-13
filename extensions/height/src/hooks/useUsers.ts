import { useFetch } from "@raycast/utils";
import { useMemo } from "react";
import { ApiHeaders, ApiUrls } from "../api/helpers";
import { UserObject } from "../types/user";
import { ApiResponse } from "../types/utils";

type Props = {
  options?: Parameters<typeof useFetch<ApiResponse<UserObject[]>>>[1];
};

export default function useUsers({ options }: Props = {}) {
  const { data, error, isLoading, mutate } = useFetch<ApiResponse<UserObject[]>>(ApiUrls.users, {
    headers: ApiHeaders,
    ...options,
  });

  const { users, bots } = useMemo(() => {
    const users = data?.list?.filter((user) => !user.deleted && !user?.botType);

    const bots = data?.list?.filter((user) => !user.deleted && Boolean(user?.botType));

    return { users, bots };
  }, [data]);

  return {
    usersData: data?.list,
    users,
    bots,
    usersError: error,
    usersIsLoading: isLoading,
    usersMutate: mutate,
  };
}
