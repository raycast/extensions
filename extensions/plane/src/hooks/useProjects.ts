import { useCachedPromise } from "@raycast/utils";
import { getProject, getProjects } from "../api/projects";
import { PaginationOptions } from "@raycast/utils/dist/types";
import { Project } from "@makeplane/plane-node-sdk";

export function useProjects(config: { perPage?: number; execute?: boolean }) {
  const { data, error, isLoading, mutate, pagination } = useCachedPromise(
    (perPage?: number) => async (pagination: PaginationOptions<Project[]>) =>
      getProjects({ perPage, nextCursor: pagination.cursor }),
    [config.perPage],
    {
      initialData: [],
      keepPreviousData: true,
      execute: config.execute !== false,
    },
  );

  return {
    projects: data,
    error,
    isLoading,
    mutate,
    pagination,
  };
}

export function useProject(projectId: string) {
  const { data, error, isLoading, mutate } = useCachedPromise(
    (projectId: string) => getProject({ projectId }),
    [projectId],
  );

  return {
    project: data,
    error,
    isLoading,
    mutate,
  };
}
