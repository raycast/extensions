import { useQuery } from "@tanstack/react-query";

import { getJiraWorklogById } from "@/utils";
import type { JiraWorklog, HookQueryOptions } from "@/types";

export function useJiraWorklogQuery(
  worklogId: number,
  queryOptions?: HookQueryOptions<
    JiraWorklog,
    JiraWorklog,
    readonly [{ scope: "jira"; entity: "worklog"; worklogId: number }]
  >,
) {
  return useQuery({
    queryKey: [{ scope: "jira", entity: "worklog", worklogId }],
    queryFn: ({ queryKey }) => {
      const [{ worklogId: id }] = queryKey;
      return getJiraWorklogById(id);
    },
    staleTime: 0,
    gcTime: 30 * 1000,
    ...queryOptions,
  });
}
