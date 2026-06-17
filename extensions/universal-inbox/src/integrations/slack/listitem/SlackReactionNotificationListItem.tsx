import { NotificationActions } from "../../../action/NotificationActions";
import { SlackReactionPreview } from "../preview/SlackReactionPreview";
import { SlackBotInfo, SlackReaction, SlackUser } from "../types";
import { getAvatarIcon, MutatePromise } from "@raycast/utils";
import { getSlackIconUrl, getSlackUserAvatarUrl } from "..";
import { Notification } from "../../../notification";
import { Icon, Image, List } from "@raycast/api";
import { Page } from "../../../types";
import { match, P } from "ts-pattern";

export type SlackReactionNotificationListItemProps = {
  notification: Notification;
  slack_reaction: SlackReaction;
  mutate: MutatePromise<Page<Notification> | undefined>;
};

export function SlackReactionNotificationListItem({
  notification,
  slack_reaction,
  mutate,
}: SlackReactionNotificationListItemProps) {
  const subtitle = getSlackReactionNotificationSubtitle(slack_reaction);

  const author = getSlackReactionAuthorAccessory(slack_reaction);
  const team = getSlackReactionTeamAccessory(slack_reaction);
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
          detailsTarget={<SlackReactionPreview notification={notification} slack_reaction={slack_reaction} />}
          mutate={mutate}
        />
      }
    />
  );
}

function getSlackReactionNotificationSubtitle(slack_reaction: SlackReaction): string {
  return match(slack_reaction.item)
    .with(
      {
        type: P.union("Message", "File"),
        content: P.select(),
      },
      (slack_reaction_item) => {
        const channelName = slack_reaction_item.channel?.name;
        return channelName ? `#${channelName}` : "";
      },
    )
    .otherwise(() => "");
}

function getSlackReactionAuthorAccessory(slack_reaction: SlackReaction): List.Item.Accessory | null {
  return match(slack_reaction.item)
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

function getSlackReactionTeamAccessory(slack_reaction: SlackReaction): List.Item.Accessory | null {
  return match(slack_reaction.item)
    .with(
      {
        type: P.union("Message", "File"),
        content: P.select(),
      },
      (slack_reaction_item) => {
        const teamName = slack_reaction_item.team.name;
        const teamIconUrl = getSlackIconUrl(slack_reaction_item.team.icon);
        if (!teamName || !teamIconUrl) {
          return null;
        }
        return { icon: { source: teamIconUrl, mask: Image.Mask.Circle }, tooltip: teamName };
      },
    )
    .otherwise(() => null);
}
