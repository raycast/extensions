import { SlackReactionNotificationListItem } from "./SlackReactionNotificationListItem";
import { SlackThreadNotificationListItem } from "./SlackThreadNotificationListItem";
import { SlackStarNotificationListItem } from "./SlackStarNotificationListItem";
import { NotificationListItemProps } from "../../../notification";

export function SlackNotificationListItem({ notification, mutate }: NotificationListItemProps) {
  switch (notification.source_item.data.type) {
    case "SlackStar":
      return (
        <SlackStarNotificationListItem
          notification={notification}
          slack_star={notification.source_item.data.content}
          mutate={mutate}
        />
      );
    case "SlackReaction":
      return (
        <SlackReactionNotificationListItem
          notification={notification}
          slack_reaction={notification.source_item.data.content}
          mutate={mutate}
        />
      );
    case "SlackThread":
      return (
        <SlackThreadNotificationListItem
          notification={notification}
          slack_thread={notification.source_item.data.content}
          mutate={mutate}
        />
      );
    default:
      return null;
  }
}
