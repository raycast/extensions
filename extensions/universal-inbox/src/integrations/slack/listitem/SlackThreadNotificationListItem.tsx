import { NotificationActions } from "../../../action/NotificationActions";
import { SlackThreadPreview } from "../preview/SlackThreadPreview";
import { getAvatarIcon, MutatePromise } from "@raycast/utils";
import { getSlackIconUrl, getSlackUserAvatarUrl } from "..";
import { Notification } from "../../../notification";
import { Icon, Image, List } from "@raycast/api";
import { SlackThread } from "../types";
import { Page } from "../../../types";

export type SlackThreadNotificationListItemProps = {
  notification: Notification;
  slack_thread: SlackThread;
  mutate: MutatePromise<Page<Notification> | undefined>;
};

export function SlackThreadNotificationListItem({
  notification,
  slack_thread,
  mutate,
}: SlackThreadNotificationListItemProps) {
  const subtitle = getSlackThreadNotificationSubtitle(slack_thread);

  const author = getSlackThreadAuthorAccessory(slack_thread);
  const team = getSlackThreadTeamAccessory(slack_thread);
  const updated_at = "2023-01-01"; // TODO

  const accessories: List.Item.Accessory[] = [{ date: new Date(updated_at), tooltip: `Updated at ${updated_at}` }];

  if (author) {
    accessories.unshift(author);
  }
  if (team) {
    accessories.unshift(team);
  }

  return (
    <List.Item
      key={notification.id}
      title={notification.title}
      icon={{ source: { light: "slack-logo-dark.svg", dark: "slack-logo-light.svg" } }}
      subtitle={subtitle}
      accessories={accessories}
      actions={
        <NotificationActions
          notification={notification}
          detailsTarget={<SlackThreadPreview notification={notification} slack_thread={slack_thread} />}
          mutate={mutate}
        />
      }
    />
  );
}

function getSlackThreadNotificationSubtitle(slack_thread: SlackThread): string {
  const channelName = slack_thread.channel?.name;
  return channelName ? `in #${channelName}` : "";
}

function getSlackThreadAuthorAccessory(slack_thread: SlackThread): List.Item.Accessory | null {
  const firstUnreadMessage = slack_thread.messages[0];

  if (firstUnreadMessage.user) {
    const profile = slack_thread.sender_profiles[firstUnreadMessage.user];

    if (profile && profile.type === "User") {
      const slackUser = profile.content;
      const userAvatarUrl = getSlackUserAvatarUrl(slackUser);
      const userName = slackUser.real_name || "Unknown";
      return {
        icon: userAvatarUrl ? { source: userAvatarUrl, mask: Image.Mask.Circle } : getAvatarIcon(userName),
        tooltip: userName,
      };
    }
  }

  if (firstUnreadMessage.bot_id) {
    const profile = slack_thread.sender_profiles[firstUnreadMessage.bot_id];

    if (profile && profile.type === "Bot") {
      const slackBot = profile.content;
      const botAvatarUrl = getSlackIconUrl(slackBot.icons);
      return {
        icon: botAvatarUrl ? { source: botAvatarUrl, mask: Image.Mask.Circle } : getAvatarIcon(slackBot.name),
        tooltip: slackBot.name,
      };
    }
  }

  return { icon: Icon.Person, tooltip: "Unknown" };
}

function getSlackThreadTeamAccessory(slack_thread: SlackThread): List.Item.Accessory | null {
  const teamName = slack_thread.team.name;
  const teamIconUrl = getSlackIconUrl(slack_thread.team.icon);
  if (!teamName || !teamIconUrl) {
    return null;
  }
  return { icon: { source: teamIconUrl, mask: Image.Mask.Circle }, tooltip: teamName };
}
