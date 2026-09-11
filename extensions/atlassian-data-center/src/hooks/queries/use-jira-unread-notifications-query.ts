import { useQuery } from "@tanstack/react-query";

import { getJiraNotifications } from "@/utils";
import type { JiraNotificationsResponse, HookQueryOptions } from "@/types";

export function useJiraUnreadNotificationsQuery(
  queryOptions?: HookQueryOptions<
    JiraNotificationsResponse,
    number,
    readonly [{ scope: "jira"; entity: "notifications"; type: "unread" }]
  >,
) {
  return useQuery({
    queryKey: [{ scope: "jira", entity: "notifications", type: "unread" }],
    queryFn: () => getJiraNotifications({ offset: 0, limit: 1 }),
    select: (data) => data.unreadNotificationsCount,
    staleTime: 15 * 1000,
    ...queryOptions,
  });
}
