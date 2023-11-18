import { List, Color } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";

import {
  getNotificationIcon,
  getNotificationSubtitle,
  getNotificationTooltip,
  getNotificationTypeTitle,
  getNotificationReason,
} from "../helpers/notifications";
import { NotificationsResponse } from "../notifications";

import NotificationActions from "./NotificationActions";

export type Notification = NotificationsResponse["data"][0];

type NotificationListItemProps = {
  notification: Notification;
  userId?: string;
  mutateList: MutatePromise<Notification[] | undefined>;
};

export default function NotificationListItem({
  notification,
  userId,
  mutateList,
}: NotificationListItemProps) {
  const icon = getNotificationIcon(notification);
  const reason = getNotificationReason(notification);
  const updatedAt = new Date(notification.updated_at);

  const { repoAsTitle } = getPreferenceValues<Preferences>();

  let title = "";
  let subtitle = "";

  if(repoAsTitle){
    title = getNotificationSubtitle(notification);
    subtitle = notification.subject.title;
  } else {
    title = notification.subject.title;
    subtitle = getNotificationSubtitle(notification);
  }

  return (
    <List.Item
      icon={{
        value: { source: icon.value, tintColor: Color.PrimaryText },
        tooltip: getNotificationTypeTitle(notification),
      }}
      title={title}
      subtitle={subtitle}
      accessories={[
        {
          text: reason,
          tooltip: reason,
        },
        {
          date: updatedAt,
          tooltip: getNotificationTooltip(updatedAt),
        },
      ]}
      actions={
        <NotificationActions
          notification={notification}
          userId={userId}
          mutateList={mutateList}
        />
      }
    />
  );
}
