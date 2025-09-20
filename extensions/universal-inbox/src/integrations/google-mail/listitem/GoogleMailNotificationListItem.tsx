import { GoogleMailThreadListItem } from "./GoogleMailThreadListItem";
import { NotificationListItemProps } from "../../../notification";

export function GoogleMailNotificationListItem({ notification, mutate }: NotificationListItemProps) {
  if (notification.source_item.data.type !== "GoogleMailThread") return null;

  return (
    <GoogleMailThreadListItem
      notification={notification}
      googleMailThread={notification.source_item.data.content}
      mutate={mutate}
    />
  );
}
