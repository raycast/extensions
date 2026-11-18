import { useCachedPromise } from "@raycast/utils";
import { chain } from "lodash";

import { getNotifications } from "../api/getNotifications";
import { getInboxNotifications } from "../api/inboxNotifications";

function fetchNotifications(groupNotifications: boolean) {
  return groupNotifications ? getInboxNotifications() : getNotifications();
}

export default function useNotifications(groupNotifications = false) {
  const { data, error, isLoading, mutate } = useCachedPromise(fetchNotifications, [groupNotifications]);

  const { notifications, urlKey } = data || {};

  const now = new Date();
  // The inbox API decides whether a group is unread, independently of its representative's readAt.
  const [readNotifications, unreadNotifications] = groupNotifications
    ? [[], notifications ?? []]
    : chain(notifications)
        .filter((notification) => !notification.snoozedUntilAt || notification.snoozedUntilAt < now)
        .partition((notification) => !!notification.readAt)
        .value();

  return {
    urlKey,
    readNotifications,
    unreadNotifications,
    notificationsError: error,
    isLoadingNotifications: (!data && !error) || isLoading,
    mutateNotifications: mutate,
  };
}
