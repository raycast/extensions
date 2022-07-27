import { partition } from "lodash";
import { useCachedPromise } from "@raycast/utils";
import { getNotifications } from "../api/getNotifications";

export default function useNotifications() {
  const { data, error, isLoading, mutate } = useCachedPromise(getNotifications);

  const { notifications, urlKey } = data || {};

  const [readNotifications, unreadNotifications] = partition(notifications, (notification) => !!notification.readAt);

  return {
    urlKey,
    readNotifications,
    unreadNotifications,
    notificationsError: error,
    isLoadingNotifications: (!data && !error) || isLoading,
    mutateNotifications: mutate,
  };
}
