import { useCachedPromise } from "@raycast/utils";
import { getCurrentUser } from "../api/users";

export function useMe() {
  const { data, error, isLoading, mutate } = useCachedPromise(getCurrentUser, []);
  return {
    me: data,
    error,
    isLoading,
    mutate,
  };
}
