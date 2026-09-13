import { useCachedPromise } from "@raycast/utils";

import { getIssueDetail, IssueResult, IssueDetailResult } from "../api/getIssues";
import { useWorkspaces } from "../components/WorkspaceContext";

export default function useIssueDetail(existingIssue: IssueResult) {
  const issueId = existingIssue.id;
  const { workspaceKey } = useWorkspaces();

  const { data, error, isLoading, mutate } = useCachedPromise(
    (key: string, issueId: string) => getIssueDetail(issueId),
    [workspaceKey, issueId],
    {
      initialData: {
        ...existingIssue,
        description: "",
      } as IssueDetailResult,
    },
  );

  return { issue: data, issueError: error, isLoadingIssue: isLoading, mutateDetail: mutate };
}
