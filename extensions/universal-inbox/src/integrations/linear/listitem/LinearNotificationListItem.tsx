import { LinearProjectNotificationListItem } from "./LinearProjectNotificationListItem";
import { LinearIssueNotificationListItem } from "./LinearIssueNotificationListItem";
import { NotificationListItemProps } from "../../../notification";

export function LinearNotificationListItem({ notification, mutate }: NotificationListItemProps) {
  if (notification.metadata.type !== "Linear") return null;

  switch (notification.metadata.content.type) {
    case "IssueNotification":
      return (
        <LinearIssueNotificationListItem
          notification={notification}
          linearIssueNotification={notification.metadata.content.content}
          mutate={mutate}
        />
      );
    case "ProjectNotification":
      return (
        <LinearProjectNotificationListItem
          notification={notification}
          linearProjectNotification={notification.metadata.content.content}
          mutate={mutate}
        />
      );
    default:
      return null;
  }
}
