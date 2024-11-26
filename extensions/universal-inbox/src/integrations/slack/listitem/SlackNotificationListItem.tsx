import { NotificationDetails, NotificationListItemProps } from "../../../notification";
import { NotificationActions } from "../../../action/NotificationActions";
import { SlackStarPreview } from "../preview/SlackStarPreview";
import { SlackBotInfo, SlackIcon, SlackUser } from "../types";
/* import { NotificationActions } from "../../../action/NotificationActions"; */
import { Icon, Image, List } from "@raycast/api";
import { getAvatarIcon } from "@raycast/utils";
import { match, P } from "ts-pattern";

export function SlackNotificationListItem({ notification, mutate }: NotificationListItemProps) {
  const subtitle = getSlackNotificationSubtitle(notification.details);

  const author = getSlackAuthorAccessory(notification.details);
  const team = getSlackTeamAccessory(notification.details);
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
          detailsTarget={<SlackStarPreview notification={notification} />}
          mutate={mutate}
        />
      }
    />
  );
}

function getSlackNotificationSubtitle(notificationDetails?: NotificationDetails): string {
  return match(notificationDetails)
    .with(
      {
        type: P.union("SlackMessage", "SlackFile", "SlackFileComment", "SlackChannel", "SlackIm", "SlackGroup"),
        content: P.select(),
      },
      (slackNotificationDetails) => {
        const channelName = slackNotificationDetails.channel?.name;
        return channelName ? `#${channelName}` : "";
      },
    )
    .otherwise(() => "");
}

function getSlackAuthorAccessory(notificationDetails?: NotificationDetails): List.Item.Accessory | null {
  return match(notificationDetails)
    .with(
      {
        type: "SlackMessage",
        content: P.select(),
      },
      (slackNotificationDetails) => {
        return match(slackNotificationDetails.sender)
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

function getSlackTeamAccessory(notificationDetails?: NotificationDetails): List.Item.Accessory | null {
  return match(notificationDetails)
    .with(
      {
        type: P.union("SlackMessage", "SlackFile", "SlackFileComment", "SlackChannel", "SlackIm", "SlackGroup"),
        content: P.select(),
      },
      (slackNotificationDetails) => {
        const teamName = slackNotificationDetails.team.name;
        const teamIconUrl = getSlackIconUrl(slackNotificationDetails.team.icon);
        if (!teamName || !teamIconUrl) {
          return null;
        }
        return { icon: { source: teamIconUrl, mask: Image.Mask.Circle }, tooltip: teamName };
      },
    )
    .otherwise(() => null);
}

function getSlackUserAvatarUrl(slackUser: SlackUser): string | null {
  if (!slackUser.profile) {
    return null;
  }
  if (slackUser.profile.image_24) {
    return slackUser.profile.image_24;
  }
  if (slackUser.profile.image_32) {
    return slackUser.profile.image_32;
  }
  if (slackUser.profile.image_34) {
    return slackUser.profile.image_34;
  }
  if (slackUser.profile.image_44) {
    return slackUser.profile.image_44;
  }
  if (slackUser.profile.image_48) {
    return slackUser.profile.image_48;
  }
  return null;
}

function getSlackIconUrl(slackIcon?: SlackIcon): string | null {
  if (slackIcon?.image_24) {
    return slackIcon.image_24;
  }
  if (slackIcon?.image_32) {
    return slackIcon.image_32;
  }
  if (slackIcon?.image_34) {
    return slackIcon.image_34;
  }
  if (slackIcon?.image_44) {
    return slackIcon.image_44;
  }
  if (slackIcon?.image_48) {
    return slackIcon.image_48;
  }
  return null;
}
