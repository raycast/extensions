import { getCurrentUser } from "../api/users";
import { useCachedPromise } from "@raycast/utils";

export default function useMe() {
  const { data, error, isLoading, mutate } = useCachedPromise(getCurrentUser, []);
  return {
    me: data,
    error,
    isLoading,
    mutate,
  };
}
