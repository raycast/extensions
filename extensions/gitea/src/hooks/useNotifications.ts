import { getNotifications } from "../api/notifications";
import { CacheKey, DEFAULT_PAGE_SIZE } from "../constants";
import { NotificationStatusFilter } from "../types/sorts/notification-search";
import { usePaginatedCachedPromise } from "./usePaginatedCachedPromise";

export function useNotifications(filter: NotificationStatusFilter) {
  return usePaginatedCachedPromise({
    cacheKey: CacheKey.Notifications,
    errorTitle: "Couldn't retrieve notifications",
    pageSize: DEFAULT_PAGE_SIZE,
    args: [filter] as [NotificationStatusFilter],
    fetchPage: (page, f) =>
      getNotifications({
        all: f === NotificationStatusFilter.All,
        page,
        limit: DEFAULT_PAGE_SIZE,
      }),
  });
}
