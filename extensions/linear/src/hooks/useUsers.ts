import { useCachedPromise } from "@raycast/utils";

import { getLinearClient } from "../api/linearClient";
import { useWorkspaces } from "../components/WorkspaceContext";

export default function useUsers(query: string = "") {
  const { linearClient } = getLinearClient();
  const { workspaceKey } = useWorkspaces();

  const { data, error, isLoading } = useCachedPromise(
    async (key: string, contains: string) => {
      const users = await linearClient.users(
        contains.trim().length > 0 ? { filter: { name: { containsIgnoreCase: contains } } } : undefined,
      );
      return { users: users?.nodes ?? [], hasMoreUsers: !!users?.pageInfo?.hasNextPage };
    },
    [workspaceKey, query],
    { initialData: [] },
  );

  return {
    users: data?.users,
    supportsUserTypeahead: query.trim().length > 0 || data?.hasMoreUsers,
    usersError: error,
    isLoadingUsers: (!data && !error) || isLoading,
  };
}
