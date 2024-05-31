import { List } from "@raycast/api";
import { MutatePromise, useCachedPromise } from "@raycast/utils";

import {
  getNotificationIcon,
  getNotificationSubtitle,
  getNotificationTooltip,
  getNotificationTypeTitle,
} from "../helpers/notifications";
import { NotificationsResponse } from "../notifications";

import NotificationActions from "./NotificationActions";

export type Notification = NotificationsResponse["data"][0];

type NotificationListItemProps = {
  notification: Notification;
  userId?: string;
  mutateList: MutatePromise<Notification[] | undefined>;
};

export default function NotificationListItem({ notification, userId, mutateList }: NotificationListItemProps) {
  const updatedAt = new Date(notification.updated_at);

  const { data: icon, isLoading } = useCachedPromise(
    async (notification: Notification) => {
      return getNotificationIcon(notification);
    },
    [notification],
    {
      keepPreviousData: true,
    },
  );

  if (isLoading || !icon) {
    return null;
  }

  return (
    <List.Item
      icon={{
        value: icon.value,
        tooltip: getNotificationTypeTitle(notification),
      }}
      title={notification.subject.title}
      subtitle={getNotificationSubtitle(notification)}
      accessories={[
        {
          date: updatedAt,
          tooltip: getNotificationTooltip(updatedAt),
        },
      ]}
      actions={<NotificationActions notification={notification} userId={userId} mutateList={mutateList} />}
    />
  );
}
