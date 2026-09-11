import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useRef } from "react";
import { gitlab } from "../../common";
import { fetchMRCommitsGqlPage, fetchProjectCommitsGqlPage, resetProjectCommitsGqlCursors } from "./commits_gql";
import { Commit } from "./types";

export type ListPagination = List.Props["pagination"];

export function usePaginatedProjectCommits(options: {
  cacheKey: string;
  projectFullPath: string;
  refName: string;
  execute?: boolean;
  keepPreviousData?: boolean;
}): {
  commits: Commit[];
  isLoading: boolean;
  performRefetch: () => void;
  pagination: ListPagination;
} {
  const projectFullPathRef = useRef(options.projectFullPath);
  projectFullPathRef.current = options.projectFullPath;
  const refNameRef = useRef(options.refName);
  refNameRef.current = options.refName;
  const cacheKeyRef = useRef(options.cacheKey);
  if (cacheKeyRef.current !== options.cacheKey) {
    resetProjectCommitsGqlCursors(cacheKeyRef.current);
    cacheKeyRef.current = options.cacheKey;
  }

  const { data, isLoading, revalidate, pagination } = useCachedPromise(
    (cacheKey: string) => async (paginationOptions: { page: number }) => {
      const { commits, hasMore } = await fetchProjectCommitsGqlPage({
        cacheKey,
        page: paginationOptions.page,
        projectFullPath: projectFullPathRef.current,
        ref: refNameRef.current,
      });
      return { data: commits, hasMore };
    },
    [options.cacheKey],
    {
      execute: options.execute,
      keepPreviousData: options.keepPreviousData,
      initialData: [],
    },
  );

  return {
    commits: data,
    isLoading,
    performRefetch: revalidate,
    pagination,
  };
}

export function usePaginatedMergeRequestCommits(options: {
  cacheKey: string;
  projectID: number;
  mrIID: number;
  execute?: boolean;
  keepPreviousData?: boolean;
}): {
  commits: Commit[];
  isLoading: boolean;
  performRefetch: () => void;
  pagination: ListPagination;
} {
  const projectIDRef = useRef(options.projectID);
  projectIDRef.current = options.projectID;
  const mrIIDRef = useRef(options.mrIID);
  mrIIDRef.current = options.mrIID;

  const { data, isLoading, revalidate, pagination } = useCachedPromise(
    (cacheKey: string) => async (paginationOptions: { page: number }) => {
      const project = await gitlab.getProject(projectIDRef.current);
      const { commits, hasMore } = await fetchMRCommitsGqlPage({
        cacheKey,
        page: paginationOptions.page,
        projectFullPath: project.fullPath,
        mrIID: mrIIDRef.current,
      });
      return { data: commits, hasMore };
    },
    [options.cacheKey],
    {
      execute: options.execute,
      keepPreviousData: options.keepPreviousData,
      initialData: [],
    },
  );

  return {
    commits: data,
    isLoading,
    performRefetch: revalidate,
    pagination,
  };
}
