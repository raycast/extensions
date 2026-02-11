import { LinearProjectNotificationListItem } from "./LinearProjectNotificationListItem";
import { LinearIssueNotificationListItem } from "./LinearIssueNotificationListItem";
import { NotificationListItemProps } from "../../../notification";

export function LinearNotificationListItem({ notification, mutate }: NotificationListItemProps) {
  if (notification.source_item.data.type !== "LinearNotification") return null;

  switch (notification.source_item.data.content.type) {
    case "IssueNotification":
      return (
        <LinearIssueNotificationListItem
          notification={notification}
          linearIssueNotification={notification.source_item.data.content.content}
          mutate={mutate}
        />
      );
    case "ProjectNotification":
      return (
        <LinearProjectNotificationListItem
          notification={notification}
          linearProjectNotification={notification.source_item.data.content.content}
          mutate={mutate}
        />
      );
    default:
      return null;
  }
}
