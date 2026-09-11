import { useQuery } from "@tanstack/react-query";

import { JIRA_API } from "@/constants";
import { getJiraIssueTransitions, transformURL } from "@/utils";
import type { JiraIssueTransitionsResponse, HookQueryOptions } from "@/types";

export function useJiraIssueTransitionsQuery(
  issueKey: string,
  queryOptions?: HookQueryOptions<
    JiraIssueTransitionsResponse,
    JiraIssueTransitionsResponse,
    readonly [{ scope: "jira"; entity: "issue"; issueKey: string; subEntity: "transitions" }]
  >,
) {
  return useQuery({
    queryKey: [{ scope: "jira", entity: "issue", issueKey, subEntity: "transitions" }],
    queryFn: ({ queryKey }) => {
      const [{ issueKey: key }] = queryKey;
      const url = transformURL(JIRA_API.ISSUE_TRANSITIONS, { issueIdOrKey: key });
      return getJiraIssueTransitions(url);
    },
    staleTime: 0,
    gcTime: 30 * 1000,
    ...queryOptions,
  });
}
