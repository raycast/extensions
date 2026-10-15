import { useCachedPromise } from "@raycast/utils";
import { getMemberProjects, getProject, getProjects } from "../api/projects";
import { PaginationOptions } from "@raycast/utils/dist/types";
import { Project } from "@makeplane/plane-node-sdk";
import { planeClient } from "../api/auth";
import { errorShownInline } from "../helpers/errors";

export function useProjects(config: { perPage?: number; execute?: boolean }) {
  const { data, error, isLoading, mutate, pagination, revalidate } = useCachedPromise(
    // The slug is part of the cache key so switching workspaces never shows another workspace's projects.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the slug only scopes the cache key
    (perPage?: number, _workspaceSlug?: string) => async (pagination: PaginationOptions<Project[]>) =>
      getProjects({ perPage, nextCursor: pagination.cursor }),
    [config.perPage, planeClient?.workspaceSlug],
    {
      initialData: [],
      keepPreviousData: true,
      onError: errorShownInline,
      execute: config.execute !== false,
    },
  );

  return {
    projects: data,
    error,
    isLoading,
    mutate,
    pagination,
    revalidate,
  };
}

/** Projects the user is a member of (all pages), for dropdowns. */
export function useMemberProjects(config: { execute?: boolean } = {}) {
  const { data, error, isLoading, revalidate } = useCachedPromise(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the slug only scopes the cache key
    (_workspaceSlug?: string) => getMemberProjects(),
    [planeClient?.workspaceSlug],
    { keepPreviousData: true, execute: config.execute !== false },
  );
  return { projects: data ?? [], error, isLoading, revalidate };
}

export function useProject(projectId: string) {
  const { data, error, isLoading, mutate } = useCachedPromise(
    (projectId: string) => getProject({ projectId }),
    [projectId],
    { execute: !!projectId },
  );

  return {
    project: data,
    error,
    isLoading,
    mutate,
  };
}
