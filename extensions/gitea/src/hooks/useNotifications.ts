import { getNotifications } from "../services/notifications";
import { CacheKey, DEFAULT_PAGE_SIZE } from "../constants";
import { NotificationStatusFilter } from "../domain/notification";
import { usePaginatedResource } from "./usePaginatedResource";

export function useNotifications(filter: NotificationStatusFilter) {
  return usePaginatedResource({
    cacheKey: CacheKey.Notifications,
    errorTitle: "Couldn't retrieve notifications",
    pageSize: DEFAULT_PAGE_SIZE,
    params: { filter },
    fetchPage: ({ filter: f, page, limit }) =>
      getNotifications({
        all: f === NotificationStatusFilter.All,
        page,
        limit,
      }),
  });
}
