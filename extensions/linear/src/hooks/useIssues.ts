import { useCachedPromise } from "@raycast/utils";

import { IssueResult } from "../api/getIssues";
import { useWorkspaces } from "../components/WorkspaceContext";

export default function useIssues<T>(
  fetcher: (...args: T[]) => Promise<IssueResult[] | undefined>,
  args: T[] = [],
  config?: { execute?: boolean; keepPreviousData?: boolean },
) {
  const { workspaceKey } = useWorkspaces();
  const { data, error, isLoading, mutate } = useCachedPromise(
    (key: string, ...rest: T[]) => fetcher(...rest),
    [workspaceKey, ...args],
    config,
  );

  return { issues: data, issuesError: error, isLoadingIssues: isLoading, mutateList: mutate };
}
