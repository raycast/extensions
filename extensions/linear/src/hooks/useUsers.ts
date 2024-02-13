import { getLinearClient } from "../api/linearClient";
import { useCachedPromise } from "@raycast/utils";

export default function useUsers() {
  const { linearClient } = getLinearClient();

  const { data, error, isLoading } = useCachedPromise(
    async () => {
      const users = await linearClient.users();
      return users.nodes;
    },
    [],
    { initialData: [] },
  );

  return { users: data, usersError: error, isLoadingUsers: (!data && !error) || isLoading };
}
