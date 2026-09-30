import { useQuery } from "@tanstack/react-query";

import { getJiraProjects } from "@/utils";
import type { JiraIssueProject, HookQueryOptions } from "@/types";

export function useJiraProjectsQuery(
  queryOptions?: HookQueryOptions<
    JiraIssueProject[],
    JiraIssueProject[],
    readonly [{ scope: "jira"; entity: "projects" }]
  >,
) {
  return useQuery({
    queryKey: [{ scope: "jira", entity: "projects" }],
    queryFn: getJiraProjects,
    select: (data) => data.map((item) => item.key),
    staleTime: Infinity,
    gcTime: Infinity,
    ...queryOptions,
  });
}
