import { useCachedPromise } from "@raycast/utils";
import { pscale } from "./api";

export function useOrganizations() {
  const { data: organizations, isLoading: organizationsLoading } = useCachedPromise(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async (key) => {
      const response = await pscale.listOrganizations({
        page: 1,
        per_page: 25,
      });
      return response.data.data;
    },
    ["organizations"],
  );
  return { organizations, organizationsLoading };
}

export function useDatabases(args: { organization?: string }) {
  const { data: databases, isLoading: databasesLoading } = useCachedPromise(
    async (key, { organization }) => {
      if (!organization) {
        return [];
      }
      const response = await pscale.listDatabases({
        page: 1,
        per_page: 25,
        organization,
      });
      return response.data.data;
    },
    ["databases", args],
    {
      initialData: [],
    },
  );
  return { databases, databasesLoading };
}

export function useBranches(args: { organization?: string; database?: string }) {
  const { data: branches, isLoading: branchesLoading } = useCachedPromise(
    async (key, { organization, database }) => {
      if (!organization || !database) {
        return [];
      }
      const response = await pscale.listBranches({
        page: 1,
        per_page: 25,
        organization,
        database,
      });
      return response.data.data;
    },
    ["branches", args],
    {
      initialData: [],
    },
  );
  return { branches, branchesLoading };
}

export function useSelectedOrganization() {}
