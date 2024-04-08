import { Color, List } from "@raycast/api";
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
  notification: Notification;
  userId?: string;
  mutateList: MutatePromise<Notification[] | undefined>;
};

export default function NotificationListItem({ notification, userId, mutateList }: NotificationListItemProps) {
  const updatedAt = new Date(notification.updated_at);

  const icon = getNotificationIcon(notification);

  return (
    <List.Item
      icon={{
        value: { source: icon.value, tintColor: Color.PrimaryText },
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
