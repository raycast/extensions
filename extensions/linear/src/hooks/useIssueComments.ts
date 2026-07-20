import { Issue } from "@linear/sdk";
import { useCachedPromise } from "@raycast/utils";

import { getComments } from "../api/getIssues";

export default function useIssueComments(issueId: Issue["id"]) {
  const { data, error, isLoading, mutate } = useCachedPromise(getComments, [issueId]);

  return { comments: data, commentsError: error, isLoadingComments: isLoading, mutateComments: mutate };
}
