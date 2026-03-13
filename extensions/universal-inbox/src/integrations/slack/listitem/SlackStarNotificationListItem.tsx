import { NotificationActions } from "../../../action/NotificationActions";
import { SlackStarPreview } from "../preview/SlackStarPreview";
import { getAvatarIcon, MutatePromise } from "@raycast/utils";
import { SlackBotInfo, SlackStar, SlackUser } from "../types";
import { getSlackIconUrl, getSlackUserAvatarUrl } from "..";
import { Notification } from "../../../notification";
import { Icon, Image, List } from "@raycast/api";
import { Page } from "../../../types";
import { match, P } from "ts-pattern";

export type SlackStarNotificationListItemProps = {
  notification: Notification;
  slack_star: SlackStar;
  mutate: MutatePromise<Page<Notification> | undefined>;
};

export function SlackStarNotificationListItem({
  notification,
  slack_star,
  mutate,
}: SlackStarNotificationListItemProps) {
  const subtitle = getSlackStarNotificationSubtitle(slack_star);

  const author = getSlackStarAuthorAccessory(slack_star);
  const team = getSlackStarTeamAccessory(slack_star);
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
          detailsTarget={<SlackStarPreview notification={notification} slack_star={slack_star} />}
          mutate={mutate}
        />
      }
    />
  );
}

function getSlackStarNotificationSubtitle(slack_star: SlackStar): string {
  return match(slack_star.item)
    .with(
      {
        type: P.union("Message", "File", "FileComment", "Channel", "Im", "Group"),
        content: P.select(),
      },
      (slack_star_item) => {
        const channelName = slack_star_item.channel?.name;
        return channelName ? `#${channelName}` : "";
      },
    )
    .otherwise(() => "");
}

function getSlackStarAuthorAccessory(slack_star: SlackStar): List.Item.Accessory | null {
  return match(slack_star.item)
    .with(
      {
        type: "Message",
        content: P.select(),
      },
      (slackMessageDetails) => {
        return match(slackMessageDetails.sender)
          .with({ type: "User", content: P.select() }, (slackUser: SlackUser) => {
            const userAvatarUrl = getSlackUserAvatarUrl(slackUser);
            const userName = slackUser.real_name || "Unknown";
            return {
              icon: userAvatarUrl ? { source: userAvatarUrl, mask: Image.Mask.Circle } : getAvatarIcon(userName),
              tooltip: userName,
            };
          })
          .with({ type: "Bot", content: P.select() }, (slackBot: SlackBotInfo) => {
            const botAvatarUrl = getSlackIconUrl(slackBot.icons);
            return {
              icon: botAvatarUrl ? { source: botAvatarUrl, mask: Image.Mask.Circle } : getAvatarIcon(slackBot.name),
              tooltip: slackBot.name,
            };
          })
          .otherwise(() => ({ icon: Icon.Person, tooltip: "Unknown" }));
      },
    )
    .otherwise(() => null);
}

function getSlackStarTeamAccessory(slack_star: SlackStar): List.Item.Accessory | null {
  return match(slack_star.item)
    .with(
      {
        type: P.union("Message", "File", "FileComment", "Channel", "Im", "Group"),
        content: P.select(),
      },
      (slack_star_item) => {
        const teamName = slack_star_item.team.name;
        const teamIconUrl = getSlackIconUrl(slack_star_item.team.icon);
        if (!teamName || !teamIconUrl) {
          return null;
        }
        return { icon: { source: teamIconUrl, mask: Image.Mask.Circle }, tooltip: teamName };
      },
    )
    .otherwise(() => null);
}
