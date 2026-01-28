import { useCachedPromise } from "@raycast/utils";
import { chain } from "lodash";

import { getNotifications } from "../api/getNotifications";

export default function useNotifications() {
  const { data, error, isLoading, mutate } = useCachedPromise(getNotifications);

  const { notifications, urlKey } = data || {};

  const now = new Date();
  const [readNotifications, unreadNotifications] = chain(notifications)
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
