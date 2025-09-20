import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";

import { getUser } from "@/api/user";
import { CachedPromiseOptionsType } from "@/types/utils";

type Props = {
  options?: CachedPromiseOptionsType<Awaited<ReturnType<typeof getUser>>>;
};

export default function useUsers({ options }: Props = {}) {
  const { data, error, isLoading, mutate } = useCachedPromise(getUser, [], {
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
