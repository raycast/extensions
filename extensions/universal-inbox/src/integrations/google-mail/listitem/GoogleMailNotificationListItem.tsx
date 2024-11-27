import { GoogleMailThreadListItem } from "./GoogleMailThreadListItem";
import { NotificationListItemProps } from "../../../notification";

export function GoogleMailNotificationListItem({ notification, mutate }: NotificationListItemProps) {
  if (notification.metadata.type !== "GoogleMail") return null;

  return (
    <GoogleMailThreadListItem
      notification={notification}
      googleMailThread={notification.metadata.content}
      mutate={mutate}
    />
  );
}
