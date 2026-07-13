import { useCachedPromise } from "@raycast/utils";
import { DokployAccount } from "../accounts/types";
import { DokployClient } from "../api/client";
import { enrichServices, flattenServices, listProjects } from "../api/dokploy-api";
import { toErrorMessage } from "../api/errors";
import { Project, ServiceRef } from "../types/dokploy";

export interface EnvironmentNode {
  environmentId: string;
  name: string;
  isDefault: boolean;
  services: ServiceRef[];
}

export interface ProjectNode {
  projectId: string;
  name: string;
  description: string | null;
  environments: EnvironmentNode[];
  serviceCount: number;
}

/**
 * Reduces the raw project tree to just what the UI renders.
 *
 * This is a security boundary as much as a convenience one: for owners and admins `project.all`
 * returns *full* rows, which include `env`, `buildSecrets` and database passwords. Whatever this
 * function returns is what `useCachedPromise` writes to Raycast's on-disk cache, and that cache is
 * not encrypted - so nothing secret may survive this step. Detail views fetch the sensitive fields
 * on demand through `usePromise`, which does not cache.
 */
function toProjectNodes(projects: Project[], services: ServiceRef[]): ProjectNode[] {
  return projects.map((project) => {
    const environments: EnvironmentNode[] = (project.environments ?? []).map((environment) => ({
      environmentId: environment.environmentId,
      name: environment.name,
      isDefault: environment.isDefault ?? false,
      services: services.filter((service) => service.environmentId === environment.environmentId),
    }));

    return {
      projectId: project.projectId,
      name: project.name,
      description: project.description ?? null,
      environments,
      serviceCount: environments.reduce((total, environment) => total + environment.services.length, 0),
    };
  });
}

/**
 * The project tree, with the services Dokploy only sent an id for topped up from their own routes.
 * Used by every command and the menu bar, so they all agree on what a service is called.
 */
async function loadProjectNodes(client: DokployClient): Promise<ProjectNode[]> {
  const projects = await listProjects(client);
  const services = await enrichServices(client, flattenServices(projects));
  return toProjectNodes(projects, services);
}

/**
 * The dependency is the *account id*, never the client itself. `useCachedPromise` derives its
 * cache key from the arguments, and a `DokployClient` carries the API key - passing the client
 * would serialize that key into the unencrypted cache. The id is both safe to store and enough
 * to keep each account's projects in its own cache entry and to re-fetch when the user switches.
 */
export function useProjects(client?: DokployClient) {
  return useCachedPromise(
    async (accountId?: string): Promise<ProjectNode[]> => {
      if (!client || !accountId) return [];
      return loadProjectNodes(client);
    },
    [client?.account.id],
    {
      execute: client !== undefined,
      initialData: [] as ProjectNode[],
      failureToastOptions: { title: "Could Not Load Projects" },
    },
  );
}

/** Every service across every project, flattened for the search command. */
export function useServices(client?: DokployClient) {
  const { data, ...rest } = useProjects(client);
  const services = (data ?? []).flatMap((project) => project.environments.flatMap((env) => env.services));
  return { services, ...rest };
}

/** One account's projects, plus whatever went wrong reaching it. */
export interface AccountProjects {
  accountId: string;
  accountLabel: string;
  projects: ProjectNode[];
  /** Set when this instance could not be reached or rejected the key. */
  error?: string;
}

/**
 * Loads projects for every connected account at once, for the menu bar.
 *
 * Two things matter here. Accounts are fetched with `allSettled`, so one unreachable instance
 * shows up as an error row instead of blanking out every other account. And the cache key is the
 * list of account *ids* - never the accounts themselves, which carry API keys that must not reach
 * Raycast's unencrypted cache.
 */
export function useAllProjects(accounts: DokployAccount[]) {
  const accountIds = accounts.map((account) => account.id).join(",");

  return useCachedPromise(
    async (ids: string): Promise<AccountProjects[]> => {
      if (!ids) return [];

      const results = await Promise.allSettled(accounts.map((account) => loadProjectNodes(new DokployClient(account))));

      return accounts.map((account, index) => {
        const result = results[index];
        return result.status === "fulfilled"
          ? { accountId: account.id, accountLabel: account.label, projects: result.value }
          : {
              accountId: account.id,
              accountLabel: account.label,
              projects: [],
              error: toErrorMessage(result.reason),
            };
      });
    },
    [accountIds],
    {
      execute: accounts.length > 0,
      initialData: [] as AccountProjects[],
    },
  );
}
