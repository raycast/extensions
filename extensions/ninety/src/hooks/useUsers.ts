import { useCachedPromise } from "@raycast/utils";
import { getUsers } from "../api/ninety";
import { personName } from "../lib/format";

/** Company users, only used to show owner names. Failures are silent; names just fall back. */
export function useUsers() {
  const { data, isLoading } = useCachedPromise(getUsers, [], { onError: () => undefined });
  const users = data ?? [];
  const userName = (userId?: string) => {
    const user = users.find((u) => u.id === userId);
    return user ? personName(user) : undefined;
  };
  return { users, userName, isLoading };
}
