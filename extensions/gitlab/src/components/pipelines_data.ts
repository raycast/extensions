import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useRef } from "react";
import { Pipeline } from "../gitlabapi";
import { fetchMRPipelinesPage, fetchProjectPipelinesGqlPage } from "./pipelines_gql";

export type ListPagination = List.Props["pagination"];

export function usePaginatedProjectPipelines(options: {
  cacheKey: string;
  projectFullPath: string;
  execute?: boolean;
  keepPreviousData?: boolean;
}): {
  pipelines: Pipeline[];
  isLoading: boolean;
  performRefetch: () => void;
  pagination: ListPagination;
} {
  const projectFullPathRef = useRef(options.projectFullPath);
  projectFullPathRef.current = options.projectFullPath;

  const { data, isLoading, revalidate, pagination } = useCachedPromise(
    (cacheKey: string) => async (paginationOptions: { page: number }) => {
      const { pipelines, hasMore } = await fetchProjectPipelinesGqlPage({
        cacheKey,
        page: paginationOptions.page,
        projectFullPath: projectFullPathRef.current,
      });
      return { data: pipelines, hasMore };
    },
    [options.cacheKey],
    {
      execute: options.execute,
      keepPreviousData: options.keepPreviousData,
      initialData: [],
    },
  );

  return {
    pipelines: data,
    isLoading,
    performRefetch: revalidate,
    pagination,
  };
}

export function usePaginatedMRPipelines(options: {
  projectId: number;
  mrIID: number;
  execute?: boolean;
  keepPreviousData?: boolean;
}): {
  pipelines: Pipeline[];
  isLoading: boolean;
  performRefetch: () => void;
  pagination: ListPagination;
} {
  const { data, isLoading, revalidate, pagination } = useCachedPromise(
    (projectId: number, mrIID: number) => async (paginationOptions: { page: number }) => {
      const { pipelines, hasMore } = await fetchMRPipelinesPage({
        page: paginationOptions.page,
        projectId,
        mrIID,
      });
      return { data: pipelines, hasMore };
    },
    [options.projectId, options.mrIID],
    {
      execute: options.execute,
      keepPreviousData: options.keepPreviousData,
      initialData: [],
    },
  );

  return {
    pipelines: data,
    isLoading,
    performRefetch: revalidate,
    pagination,
  };
}
