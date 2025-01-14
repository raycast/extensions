import { List } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";

import { getNotificationSubtitle, getNotificationTooltip, getNotificationTypeTitle } from "../helpers/notifications";
import { NotificationWithIcon } from "../notifications";

import NotificationActions from "./NotificationActions";

type NotificationListItemProps = {
  notification: NotificationWithIcon;
  userId?: string;
  mutateList: MutatePromise<NotificationWithIcon[] | undefined>;
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
