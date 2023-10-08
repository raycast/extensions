import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";
import { ApiUser } from "../api/user";
import { UseCachedPromiseOptions } from "../types/utils";

type Props = {
  options?: UseCachedPromiseOptions<typeof ApiUser.get>;
};

export default function useUsers({ options }: Props = {}) {
  const { data, error, isLoading, mutate } = useCachedPromise(ApiUser.get, [], {
    ...options,
  });

  const { users, bots } = useMemo(() => {
    const users = data?.list?.filter((user) => !user?.deleted && !user?.botType);

    const bots = data?.list?.filter((user) => !user?.deleted && Boolean(user?.botType));

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
