import { useCachedPromise } from "@raycast/utils";

import { getCustomViews, getCustomViewIssues, CustomViewResult } from "../api/getCustomViews";
import { IssueResult } from "../api/getIssues";

export function useCustomViews() {
  const { data, error, isLoading } = useCachedPromise(getCustomViews);

  return { customViews: data, customViewsError: error, isLoadingCustomViews: isLoading };
}

export function useCustomViewIssues(viewId: string) {
  const { data, error, isLoading, mutate } = useCachedPromise(getCustomViewIssues, [viewId], {
    execute: !!viewId,
  });

  return {
    issues: data,
    issuesError: error,
    isLoadingIssues: isLoading,
    mutateList: mutate,
  };
}

export type { CustomViewResult, IssueResult };
