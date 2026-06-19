import { getNotifications } from "../services/notifications";
import { CacheKey, DEFAULT_PAGE_SIZE } from "../constants";
import { NotificationStatusFilter } from "../domain/notification";
import type { NotificationThread } from "../types/api";
import { usePaginatedResource } from "./usePaginatedResource";

export function useNotifications(filter: NotificationStatusFilter) {
  return usePaginatedResource<NotificationThread, { filter: NotificationStatusFilter }>({
    cacheKey: CacheKey.Notifications,
    errorTitle: "Couldn't retrieve notifications",
    pageSize: DEFAULT_PAGE_SIZE,
    params: { filter },
    getItemKey: (notification) => notification.id ?? notification.url ?? notification.subject?.url,
    fetchPage: ({ filter: f, page, limit }) =>
      getNotifications({
        all: f === NotificationStatusFilter.All,
        page,
        limit,
      }),
  });
}
