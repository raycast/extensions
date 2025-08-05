import { GithubPullRequestNotificationListItem } from "./GithubPullRequestNotificationListItem";
import { GithubDiscussionNotificationListItem } from "./GithubDiscussionNotificationListItem";
import { NotificationListItemProps } from "../../../notification";

export function GithubNotificationListItem({ notification, mutate }: NotificationListItemProps) {
  if (notification.source_item.data.type !== "GithubNotification") return null;

  switch (notification.source_item.data.content.item?.type) {
    case "GithubPullRequest":
      return (
        <GithubPullRequestNotificationListItem
          notification={notification}
          githubPullRequest={notification.source_item.data.content.item.content}
          mutate={mutate}
        />
      );
    case "GithubDiscussion":
      return (
        <GithubDiscussionNotificationListItem
          notification={notification}
          githubDiscussion={notification.source_item.data.content.item.content}
          mutate={mutate}
        />
      );
    default:
      return null;
  }
}
