import { useCachedPromise } from "@raycast/utils";

import { getCustomViews, getCustomViewIssues, CustomViewResult } from "../api/getCustomViews";
import { IssueResult } from "../api/getIssues";
import { useWorkspaces } from "../components/WorkspaceContext";

export function useCustomViews() {
  const { workspaceKey } = useWorkspaces();
  const { data, error, isLoading } = useCachedPromise(
    (key: string) => {
      void key;
      return getCustomViews();
    },
    [workspaceKey],
  );

  return { customViews: data, customViewsError: error, isLoadingCustomViews: isLoading };
}

export function useCustomViewIssues(viewId: string) {
  const { workspaceKey } = useWorkspaces();
  const { data, error, isLoading, mutate } = useCachedPromise(
    (key: string, viewId: string) => getCustomViewIssues(viewId),
    [workspaceKey, viewId],
    {
      execute: !!viewId,
    },
  );

  return {
    issues: data,
    issuesError: error,
    isLoadingIssues: isLoading,
    mutateList: mutate,
  };
}

export type { CustomViewResult, IssueResult };
