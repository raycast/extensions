import { useCachedPromise, useCachedState } from "@raycast/utils";
import { pscale } from "./api";
import { useEffect } from "react";

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

export function useDeployRequests(args: { organization?: string; database?: string }) {
  const { data: deployRequests, isLoading: deployRequestsLoading } = useCachedPromise(
    async (key, { organization, database }) => {
      if (!organization || !database) {
        return [];
      }
      const response = await pscale.listDeployRequests({
        page: 1,
        per_page: 100,
        organization,
        database,
      });
      return response.data.data;
    },
    ["deploy-requests", args],
    {
      initialData: [],
    },
  );
  return { deployRequests, deployRequestsLoading };
}

export function useSelectedOrganization() {
  const [organization, setOrganization] = useCachedState<string>("organization");
  const { organizations, organizationsLoading } = useOrganizations();

  useEffect(() => {
    const defaultOrganization = organizations?.[0]?.name;
    if (!organizationsLoading && !organization && defaultOrganization) {
      setOrganization(defaultOrganization);
    }
  }, [organizationsLoading, organization, organizations]);

  return [organization, setOrganization] as const;
}

export function useSelectedDatabase() {
  const [organization] = useSelectedOrganization();
  const [database, setDatabase] = useCachedState<string>("database");
  const { databases, databasesLoading } = useDatabases({ organization });

  useEffect(() => {
    const defaultDatabase = databases?.[0]?.name;
    if (!databasesLoading && !database && defaultDatabase) {
      setDatabase(defaultDatabase);
    }
  }, [databasesLoading, database, databases]);

  return [database, setDatabase] as const;
}
