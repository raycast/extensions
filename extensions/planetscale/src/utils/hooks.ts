import { useCachedPromise, useCachedState } from "@raycast/utils";
import { useEffect } from "react";
import { getPlanetScaleClient } from "./client";
import { getServiceTokenAccesses } from "./oauth";
import { showToast, Toast } from "@raycast/api";

export function useOrganizations() {
  const pscale = getPlanetScaleClient();

  const { data: organizations, isLoading: organizationsLoading } = useCachedPromise(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async (key) => {
      const response = await pscale.listOrganizations({
        page: 1,
        per_page: 25,
      });

      const serviceTokenAccesses = await getServiceTokenAccesses();
      const allowedOrganizations = serviceTokenAccesses
        .filter((token) => token.resource_type === "Organization")
        .map((token) => token.resource_id);

      return response.data.data.filter((organization) => allowedOrganizations.includes(organization.id));
    },
    ["organizations"],
  );
  return { organizations, organizationsLoading };
}

export function useDatabases(args: { organization?: string }) {
  const pscale = getPlanetScaleClient();

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
  const pscale = getPlanetScaleClient();

  const {
    data: branches,
    isLoading: branchesLoading,
    mutate,
  } = useCachedPromise(
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

  const deleteBranch = async (branch: string) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: `Deleteting branch`, message: branch });
    try {
      await mutate(
        pscale.deleteABranch({
          organization: args.organization!,
          database: args.database!,
          name: branch,
        }),
        {
          optimisticUpdate: (branches) => {
            return branches.filter((b) => b.name !== branch);
          },
        },
      );

      toast.style = Toast.Style.Success;
      toast.title = "Branch deleted";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to delete";
      toast.message = (error as any).message;
    }
  };

  return { branches, deleteBranch, branchesLoading };
}

export function useDeployRequests(args: { organization?: string; database?: string }) {
  const pscale = getPlanetScaleClient();

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
