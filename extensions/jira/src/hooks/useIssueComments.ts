import { getComments } from "../api/comments";
import { Issue } from "../api/issues";
import { useJiraCachedPromise } from "./useJiraCache";

export default function useIssueComments(issueId: Issue["id"]) {
  const { data, error, isLoading, mutate } = useJiraCachedPromise(getComments, [issueId]);

  return { comments: data, commentsError: error, isLoadingComments: isLoading, mutateComments: mutate };
}
