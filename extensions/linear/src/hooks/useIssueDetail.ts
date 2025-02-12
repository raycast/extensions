import { getIssueDetail, IssueResult, IssueDetailResult } from "../api/getIssues";
import { useCachedPromise } from "@raycast/utils";

export default function useIssueDetail(existingIssue: IssueResult) {
  const issueId = existingIssue.id;

  const { data, error, isLoading, mutate } = useCachedPromise(getIssueDetail, [issueId], {
    initialData: {
      ...existingIssue,
      description: "",
    } as IssueDetailResult,
  });

  return { issue: data, issueError: error, isLoadingIssue: isLoading, mutateDetail: mutate };
}
