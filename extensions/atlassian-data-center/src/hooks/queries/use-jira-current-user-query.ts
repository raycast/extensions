import { useQuery } from "@tanstack/react-query";

import { getJiraCurrentUser } from "@/utils";
import type { JiraCurrentUser, HookQueryOptions } from "@/types";

export function useJiraCurrentUserQuery(
  queryOptions?: HookQueryOptions<
    JiraCurrentUser | null,
    JiraCurrentUser | null,
    readonly [{ scope: "jira"; entity: "current-user" }]
  >,
) {
  return useQuery({
    queryKey: [{ scope: "jira", entity: "current-user" }],
    queryFn: getJiraCurrentUser,
    ...queryOptions,
  });
}
