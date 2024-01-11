import { useCachedPromise, useCachedState } from "@raycast/utils";
import { getPlanetScaleClient } from "./client";
import { getServiceTokenAccesses } from "./oauth";
import { showToast, Toast } from "@raycast/api";
import { PlanetScaleError } from "./api";
import { useEffect } from "react";
import { enrichToastWithURL } from "./raycast";

function mutation<T>(callback: (...args: T[]) => Promise<void>) {
  return async (...args: T[]) => {
    try {
      await callback(...args);
    } catch (error) {
      if (error instanceof PlanetScaleError) {
        await showToast({
          title: "Error",
          message: error.data.message,
          style: Toast.Style.Failure,
        });
      } else {
        throw error;
      }
    }
  };
}

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

  const deleteBranch = mutation(async (branch: string) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: `Deleteting branch`, message: branch });
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
  });

  const createBranch = mutation(
    async (values: { name: string; parent: string; organization: string; database: string }) => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Creating branch", message: values.name });

      const branchResponse = await mutate(
        pscale.createABranch(
          { name: values.name, parent_branch: values.parent },
          { database: values.database, organization: values.organization },
        ),
        {
          shouldRevalidateAfter: true,
          optimisticUpdate: () => [],
        },
      );

      toast.title = "Branch created";
      toast.style = Toast.Style.Success;
      enrichToastWithURL(toast, { resource: "Branch", url: branchResponse.data.html_url });
    },
  );

  const refreshBranches = async () => {
    await mutate();
  };

  return { branches, createBranch, deleteBranch, refreshBranches, branchesLoading, mutate };
}

export function useDeployRequests(args: { organization?: string; database?: string }) {
  const pscale = getPlanetScaleClient();

  const {
    data: deployRequests,
    isLoading: deployRequestsLoading,
    mutate,
  } = useCachedPromise(
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

  const closeDeployRequest = mutation(async (id: string) => {
    const deployRequest = deployRequests.find((deployRequest) => deployRequest.id === id)!;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Closing deploy request`,
      message: `[#${deployRequest.number}] ${deployRequest.notes ? deployRequest.notes : ""}`,
    });
    try {
      await mutate(
        pscale.closeADeployRequest({
          organization: args.organization!,
          database: args.database!,
          number: deployRequest.number.toString(),
        }),
        {
          optimisticUpdate: (deployRequests) => {
            return deployRequests.map((r) => {
              if (r.number === deployRequest.number) {
                return {
                  ...r,
                  state: "closed",
                };
              }
              return r;
            });
          },
        },
      );
      toast.style = Toast.Style.Success;
      toast.title = "Deploy request closed";
    } catch (error) {
      if (error instanceof PlanetScaleError) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to close";
        toast.message = error.data.message;
      } else {
        throw error;
      }
    }
  });

  const createDeployRequest = mutation(
    async (values: { branch: string; deploy: string; notes?: string; organization: string; database: string }) => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Creating deploy request" });

      const deployRequest = await pscale.createADeployRequest(
        {
          branch: values.branch,
          into_branch: values.deploy,
          notes: values.notes,
        },
        { database: values.database, organization: values.organization },
      );
      toast.title = "Deploy request created";
      toast.style = Toast.Style.Success;
      enrichToastWithURL(toast, { resource: "Deploy Request", url: deployRequest.data.html_url });
    },
  );

  return { deployRequests, createDeployRequest, closeDeployRequest, deployRequestsLoading };
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
