import { GithubDiscussionPreview } from "../preview/GithubDiscussionPreview";
import { NotificationActions } from "../../../action/NotificationActions";
import { GithubDiscussion, GithubDiscussionStateReason } from "../types";
import { getGithubActorAccessory } from "../accessories";
import { Notification } from "../../../notification";
import { Color, Icon, List } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";
import { Page } from "../../../types";

interface GithubDiscussionNotificationListItemProps {
  notification: Notification;
  githubDiscussion: GithubDiscussion;
  mutate: MutatePromise<Page<Notification> | undefined>;
}

export function GithubDiscussionNotificationListItem({
  notification,
  githubDiscussion,
  mutate,
}: GithubDiscussionNotificationListItemProps) {
  const subtitle = `${githubDiscussion.repository.name_with_owner}`;

  const author = getGithubActorAccessory(githubDiscussion.author);
  const discussionStatus = getGithubDiscussionStatusAccessory(githubDiscussion.state_reason);

  const accessories: List.Item.Accessory[] = [
    author,
    { date: new Date(githubDiscussion.updated_at), tooltip: `Updated at ${githubDiscussion.updated_at}` },
  ];

  if (discussionStatus) {
    accessories.unshift(discussionStatus);
  }
  if (githubDiscussion.comments_count > 0) {
    accessories.unshift({
      text: githubDiscussion.comments_count.toString(),
      icon: Icon.Bubble,
      tooltip: `${githubDiscussion.comments_count} comments`,
    });
  }

  return (
    <List.Item
      key={notification.id}
      title={notification.title}
      icon={{ source: { light: "github-logo-dark.svg", dark: "github-logo-light.svg" } }}
      subtitle={subtitle}
      accessories={accessories}
      actions={
        <NotificationActions
          notification={notification}
          detailsTarget={<GithubDiscussionPreview notification={notification} githubDiscussion={githubDiscussion} />}
          mutate={mutate}
        />
      }
    />
  );
}

function getGithubDiscussionStatusAccessory(stateReason?: GithubDiscussionStateReason): List.Item.Accessory {
  switch (stateReason) {
    case GithubDiscussionStateReason.Duplicate:
      return {
        icon: { source: "github-discussion-duplicate.svg", tintColor: Color.SecondaryText },
        tooltip: "Answered",
      };
    case GithubDiscussionStateReason.Outdated:
      return {
        icon: { source: "github-discussion-outdated.svg", tintColor: Color.SecondaryText },
        tooltip: "Answered",
      };
    case GithubDiscussionStateReason.Reopened:
      return { icon: { source: "github-discussion-opened.svg", tintColor: Color.Green }, tooltip: "Answered" };
    case GithubDiscussionStateReason.Resolved:
      return { icon: { source: "github-discussion-closed.svg", tintColor: Color.Magenta }, tooltip: "Answered" };
    default:
      return { icon: { source: "github-discussion-opened.svg", tintColor: Color.Green }, tooltip: "Answered" };
  }
}
