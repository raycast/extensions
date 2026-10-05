import { useQuery } from "@tanstack/react-query";

import { JIRA_API } from "@/constants";
import { getJiraIssueByKey, transformURL } from "@/utils";
import type { JiraIssueResponse, HookQueryOptions } from "@/types";

export function useJiraIssueQuery(
  issueKey: string,
  queryOptions?: HookQueryOptions<
    JiraIssueResponse,
    JiraIssueResponse,
    readonly [{ scope: "jira"; entity: "issue"; issueKey: string }]
  >,
) {
  return useQuery({
    queryKey: [{ scope: "jira", entity: "issue", issueKey }],
    queryFn: ({ queryKey }) => {
      const [{ issueKey }] = queryKey;
      const url = transformURL(JIRA_API.ISSUE, { issueIdOrKey: issueKey });
      return getJiraIssueByKey(url);
    },
    staleTime: 0,
    gcTime: 30 * 1000,
    ...queryOptions,
  });
}
