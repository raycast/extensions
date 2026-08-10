import { useCallback } from "react";

import type { UseCachedPromiseReturnType } from "@raycast/utils/dist/types";

import { createFetcher } from "@/api/deno";
import type { Project, RestDatabase, RestDeployment } from "@/api/types";

/**
 * Hook: Use the official Deno API
 */
export const useDenoApi = () => {
  const fetcher = createFetcher();

  /**
   * Hook: Fetches all projects for an organization
   */
  const useProjects = useCallback(
    (organizationId: string, query: string = "") => {
      return fetcher.useFetch<Project[], null>(`/organizations/${organizationId}/projects?q=${query}`, {
        keepPreviousData: true,
      });
    },
    [fetcher],
  );

  /**
   * Hook: Fetches deployments for a project
   */
  const useProjectDeployments = useCallback(
    (id: string) => fetcher.useFetch<RestDeployment[], null>(`/projects/${id}/deployments`),
    [fetcher],
  );

  /**
   * Request: Updates a project's name
   */
  const updateProjectName = useCallback(
    (id: string, name: string, abort?: AbortSignal) =>
      fetcher.request(`/projects/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
        signal: abort,
      }),
    [fetcher],
  );

  /**
   * Hook: Fetches all databases for an organization
   */
  const useDatabases = useCallback(
    (organizationID: string, query: string = ""): UseCachedPromiseReturnType<RestDatabase[], null> => {
      const url = query
        ? `/organizations/${organizationID}/databases?q=${query}`
        : `/organizations/${organizationID}/databases`;
      return fetcher.useFetch<RestDatabase[], null>(url, {
        keepPreviousData: true,
      });
    },
    [fetcher],
  );

  return {
    updateProjectName,
    useDatabases,
    useProjectDeployments,
    useProjects,
  };
};
