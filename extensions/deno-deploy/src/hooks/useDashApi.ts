import { useCallback } from "react";

import type { UseCachedPromiseReturnType } from "@raycast/utils/dist/types";

import { createFetcher } from "@/api/dash";
import type {
  Deployment,
  DeploymentsSummary,
  LogQueryRequestParams,
  Metadata,
  Organization,
  OrganizationExtended,
  PersistedLog,
  Project,
  User,
} from "@/api/types";

/**
 * Hook: Use the unofficial Dash API
 */
export const useDashApi = () => {
  const fetcher = createFetcher();

  // These hooks use the Dash API to fetch data from the server

  /**
   * Hook: Fetches a project by its ID
   */
  const useProject = useCallback((id: string) => fetcher.useFetch<Project | null, null>(`/projects/${id}`), [fetcher]);

  /**
   * Request: Deletes a project by its ID
   */
  const deleteProject = useCallback(
    (id: string, abort?: AbortSignal) => fetcher.request(`/projects/${id}`, { method: "DELETE", signal: abort }),
    [fetcher],
  );

  /**
   * Hook: Fetches deployments for a project by its ID
   */
  const useDeployments = useCallback(
    (projectId: string) =>
      fetcher.useFetch<[Deployment[], DeploymentsSummary], null>(`/projects/${projectId}/deployments`),
    [fetcher],
  );

  /**
   * Hook: Fetches the current user
   */
  const useUser = useCallback(() => fetcher.useFetch<User, null>(`/user`), [fetcher]);

  /**
   * Request: Fetches the current user
   */
  const getUser = useCallback(() => fetcher.requestJSON<User>(`/user`), [fetcher]);

  /**
   * Hook: Fetches all organizations
   */
  const useOrganizations = useCallback(() => fetcher.useFetch<Organization[], null>(`/organizations`), [fetcher]);

  /**
   * Request: Fetches all organizations
   */
  const getUserOrganizations = useCallback(() => fetcher.requestJSON<Organization[]>(`/organizations`), [fetcher]);

  /**
   * Hook: Fetches an organization by its ID
   */
  const useOrganization = useCallback(
    (id: string) => fetcher.useFetch<OrganizationExtended, null>(`/organizations/${id}`),
    [fetcher],
  );

  /**
   * Request: Creates a playground
   */

  /**
   * Hook: Fetches logs for a deployment
   */
  const useQueryLogs = useCallback(
    (
      projectId: string,
      deploymentId: string,
      params: LogQueryRequestParams,
    ): UseCachedPromiseReturnType<{ logs: PersistedLog[] }, null> => {
      const searchParams = new URLSearchParams({
        params: JSON.stringify(params),
      });
      return fetcher.useFetch<{ logs: PersistedLog[] }, null>(
        `/projects/${projectId}/deployments/${deploymentId}/query_logs?${searchParams.toString()}`,
      );
    },
    [fetcher],
  );

  /**
   * Hook: Fetches the metadata
   */
  const useMetadata = useCallback((): UseCachedPromiseReturnType<Metadata, null> => {
    return fetcher.useFetch<Metadata, null>("/meta");
  }, [fetcher]);

  return {
    deleteProject,
    getUser,
    getUserOrganizations,
    useDeployments,
    useMetadata,
    useOrganization,
    useOrganizations,
    useProject,
    useQueryLogs,
    useUser,
  };
};
