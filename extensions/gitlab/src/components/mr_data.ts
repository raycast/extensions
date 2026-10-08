import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useRef } from "react";
import { Group, MergeRequest, Project } from "../gitlabapi";
import { getErrorMessage } from "../utils";
import { fetchMergeRequestsGqlPage, resetMRListGqlCursors } from "./mr_gql";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type ListPagination = List.Props["pagination"];

/**
 * Paginated Merge Request data provider backed by `useCachedPromise`.
 * The fetch function is kept constant (per `useCachedPromise` contract): `cacheKey`
 * drives revalidation, while `buildParams`/`project`/`group` are read through refs so the
 * latest values are used without recreating the function.
 */
export function usePaginatedMergeRequests(options: {
  cacheKey: string;
  buildParams: () => Record<string, any>;
  project?: Project;
  group?: Group;
  execute?: boolean;
  keepPreviousData?: boolean;
}): {
  mrs: MergeRequest[];
  isLoading: boolean;
  error: string | undefined;
  performRefetch: () => void;
  pagination: ListPagination;
} {
  const buildParamsRef = useRef(options.buildParams);
  buildParamsRef.current = options.buildParams;
  const projectRef = useRef(options.project);
  projectRef.current = options.project;
  const groupRef = useRef(options.group);
  groupRef.current = options.group;
  const cacheKeyRef = useRef(options.cacheKey);
  if (cacheKeyRef.current !== options.cacheKey) {
    resetMRListGqlCursors(cacheKeyRef.current);
    cacheKeyRef.current = options.cacheKey;
  }

  const { data, isLoading, error, revalidate, pagination } = useCachedPromise(
    (cacheKey: string) => async (paginationOptions: { page: number }) => {
      const { mergeRequests, hasMore } = await fetchMergeRequestsGqlPage({
        cacheKey,
        page: paginationOptions.page,
        params: buildParamsRef.current(),
        project: projectRef.current,
        group: groupRef.current,
      });
      return { data: mergeRequests, hasMore };
    },
    [options.cacheKey],
    {
      execute: options.execute,
      keepPreviousData: options.keepPreviousData,
      initialData: [],
    },
  );

  return {
    mrs: data,
    isLoading,
    error: error ? getErrorMessage(error) : undefined,
    performRefetch: revalidate,
    pagination,
  };
}
