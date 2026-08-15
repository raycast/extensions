import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseMutationOptions } from "@tanstack/react-query";

import { JIRA_API } from "@/constants";
import { transitionJiraIssue, transformURL } from "@/utils";

export function useJiraIssueTransitionMutation(
  options?: Partial<UseMutationOptions<void, Error, { issueKey: string; transitionId: string }>>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ issueKey, transitionId }) => {
      const url = transformURL(JIRA_API.ISSUE_TRANSITIONS, { issueIdOrKey: issueKey });
      const params = { transition: { id: transitionId } };
      await transitionJiraIssue(url, params);
    },
    onSuccess: (_, { issueKey }) => {
      queryClient.invalidateQueries({ queryKey: [{ scope: "jira", entity: "issue", issueKey }] });
      queryClient.invalidateQueries({
        queryKey: [{ scope: "jira", entity: "issue", issueKey, subEntity: "transitions" }],
      });
      queryClient.invalidateQueries({ queryKey: [{ scope: "jira", entity: "search", type: "issues" }] });
    },
    ...options,
  });
}
