import { getLinearClient } from "../api/linearClient";
import { useCachedPromise } from "@raycast/utils";

export default function useUsers(query: string = "") {
  const { linearClient } = getLinearClient();

  const { data, error, isLoading } = useCachedPromise(
    async (contains: string) => {
      const users = await linearClient.users(
        contains.trim().length > 0 ? { filter: { name: { containsIgnoreCase: contains } } } : undefined,
      );
      return users.nodes;
    },
    [query],
    { initialData: [] },
  );

  return { users: data, usersError: error, isLoadingUsers: (!data && !error) || isLoading };
}
