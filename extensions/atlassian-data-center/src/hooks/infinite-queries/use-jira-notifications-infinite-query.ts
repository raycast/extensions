import { useInfiniteQuery } from "@tanstack/react-query";

import { PAGINATION_SIZE, AVATAR_TYPE } from "@/constants";
import { getJiraNotifications, getJiraIssueUrl, getAvatarIcon, getJiraUserAvatarCacheKey } from "@/utils";
import { useAvatarCache } from "@/hooks";
import type {
  JiraNotificationsResponse,
  ProcessedJiraNotification,
  HookInfiniteQueryOptions,
  JiraNotificationItem,
  ListItemAccessories,
  ListItemSubtitle,
} from "@/types";

export function useJiraNotificationsInfiniteQuery(
  queryOptions?: HookInfiniteQueryOptions<
    JiraNotificationsResponse,
    { list: ProcessedJiraNotification[]; total: number },
    readonly [{ scope: "jira"; entity: "notifications" }]
  >,
) {
  const avatarCache = useAvatarCache(AVATAR_TYPE.JIRA_USER);

  return useInfiniteQuery({
    queryKey: [{ scope: "jira", entity: "notifications" }],
    queryFn: async ({ pageParam }) => {
      return await getJiraNotifications(pageParam);
    },
    initialPageParam: { offset: 0, limit: PAGINATION_SIZE },
    getNextPageParam: (lastPage, allPages) => {
      const fetchedCount = allPages.reduce((sum, page) => sum + page.notificationsList.length, 0);
      const totalCount = lastPage.count || 0;

      if (fetchedCount < totalCount) {
        return { offset: fetchedCount, limit: PAGINATION_SIZE };
      }
      return undefined;
    },
    select: (data) => {
      const allNotifications = data.pages.flatMap((page) => page.notificationsList);
      const processedNotifications: ProcessedJiraNotification[] = processList(allNotifications, avatarCache.cache);

      return {
        list: processedNotifications,
        total: data.pages[0]?.count ?? 0,
      };
    },
    ...queryOptions,
  });
}

function processList(results: JiraNotificationItem[], cacheData: Record<string, string>): ProcessedJiraNotification[] {
  return results.map((item) => processItem(item, cacheData));
}

function processItem(item: JiraNotificationItem, cacheData: Record<string, string>): ProcessedJiraNotification {
  const url = getJiraIssueUrl(item.issueKey);
  const avatarCacheKey = getJiraUserAvatarCacheKey(item.avatarUrl);
  const icon = getAvatarIcon(avatarCacheKey, cacheData, item.actionUser);

  const title = {
    value: item.title,
    tooltip: item.title,
  };

  const notificationContent = item.desktopNotificationContent ?? item.content;

  let tooltip = notificationContent;
  if (item.notificationsChildList && item.notificationsChildList.length > 0) {
    const childContents = item.notificationsChildList.map((child) => `- ${child.content}`);
    tooltip = [notificationContent, ...childContents].join("\n");
  }

  const subtitle: ListItemSubtitle = {
    value: notificationContent,
    tooltip,
  };

  const accessories: ListItemAccessories = [];

  if (item.date) {
    accessories.push({
      text: item.date,
      tooltip: item.date,
    });
  }

  if (item.state === 0) {
    accessories.push({
      tag: { value: "Unread", color: "#e1f5fe" },
      tooltip: "State: Unread",
    });
  }

  const keywords = [item.issueKey, item.actionUser];

  return {
    renderKey: String(item.notificationId),
    icon,
    title,
    keywords,
    subtitle,
    notificationId: item.notificationId,
    issueKey: item.issueKey,
    content: notificationContent,
    accessories,
    url,
    state: item.state,
    actionTime: item.longDate,
    actionMakerAvatarUrl: item.avatarUrl,
    actionMakerAvatarCacheKey: avatarCacheKey,
  };
}
