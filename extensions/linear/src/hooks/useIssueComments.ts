import { Issue } from "@linear/sdk";
import { useCachedPromise } from "@raycast/utils";

import { getComments } from "../api/getIssues";
import { useWorkspaces } from "../components/WorkspaceContext";

export default function useIssueComments(issueId: Issue["id"]) {
  const { workspaceKey } = useWorkspaces();
  const { data, error, isLoading, mutate } = useCachedPromise(
    (key: string, issueId: Issue["id"]) => getComments(issueId),
    [workspaceKey, issueId],
  );

  return { comments: data, commentsError: error, isLoadingComments: isLoading, mutateComments: mutate };
}
