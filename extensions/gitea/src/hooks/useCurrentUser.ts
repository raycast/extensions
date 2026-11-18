import { useCachedPromise, useCachedState, showFailureToast } from "@raycast/utils";
import { getCurrentUser } from "../api/user";
import type { User } from "../types/api";
import { CacheKey } from "../constants";

export function useCurrentUser(enabled = true) {
  const [user, setUser] = useCachedState<User | undefined>(CacheKey.CurrentUser);

  const { data, isLoading, revalidate, mutate } = useCachedPromise(
    async (shouldFetch: boolean) => {
      if (!shouldFetch) return undefined;
      return getCurrentUser();
    },
    [enabled] as [boolean],
    {
      keepPreviousData: true,
      initialData: user,
      onData(data) {
        if (data) setUser(data);
      },
      onError(error) {
        showFailureToast(error, { title: "Couldn't retrieve current user" });
      },
    },
  );

  return { user: data ?? user, isLoading, revalidate, mutate };
}
