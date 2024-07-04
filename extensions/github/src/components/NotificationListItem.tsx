import { List } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";

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
  notification: Notification & { icon: Awaited<ReturnType<typeof getNotificationIcon>> };
  userId?: string;
  mutateList: MutatePromise<Notification[] | undefined>;
};

export default function NotificationListItem({ notification, userId, mutateList }: NotificationListItemProps) {
  const updatedAt = new Date(notification.updated_at);

  return (
    <List.Item
      icon={{
        value: notification.icon.value,
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
