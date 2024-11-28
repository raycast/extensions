import { GithubPullRequestNotificationListItem } from "./GithubPullRequestNotificationListItem";
import { GithubDiscussionNotificationListItem } from "./GithubDiscussionNotificationListItem";
import { NotificationListItemProps } from "../../../notification";

export function GithubNotificationListItem({ notification, mutate }: NotificationListItemProps) {
  switch (notification.details?.type) {
    case "GithubPullRequest":
      return (
        <GithubPullRequestNotificationListItem
          notification={notification}
          githubPullRequest={notification.details.content}
          mutate={mutate}
        />
      );
    case "GithubDiscussion":
      return (
        <GithubDiscussionNotificationListItem
          notification={notification}
          githubDiscussion={notification.details.content}
          mutate={mutate}
        />
      );
    default:
      return null;
  }
}
