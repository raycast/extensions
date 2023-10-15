import { List, Color } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";

import { getNotificationIcon, getNotificationSubtitle, getNotificationTooltip } from "../helpers/notifications";
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

  const icon = getNotificationIcon(notification);

  return (
    <List.Item
      icon={{ source: icon.value, tintColor: Color.PrimaryText }}
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
