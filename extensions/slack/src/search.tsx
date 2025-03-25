// This filename should be named `switch-to-channel.tsx` or something similar
// but it's kept as `search.tsx` as changing the command's name will cause users to lose their keywords and aliases
import { ActionPanel, Action, Icon, List, getPreferenceValues } from "@raycast/api";
import { User, useChannels } from "./shared/client";
import { withSlackClient } from "./shared/withSlackClient";
import { useFrecencySorting } from "@raycast/utils";
import { OpenChannelInSlack, OpenChatInSlack, useSlackApp } from "./shared/OpenInSlack";
import { convertSlackEmojiToUnicode } from "./shared/utils";
import { toZonedTime } from "date-fns-tz";
import { differenceInMinutes } from "date-fns";

const { displayExtraMetadata } = getPreferenceValues<Preferences.Search>();

function getCoworkerTime(coworkerTimeZone: string): string {
  const localTime = new Date();
  const coworkerTime = toZonedTime(localTime, coworkerTimeZone);

  const diffInMinutes = differenceInMinutes(coworkerTime, localTime);
  const diffInHours = diffInMinutes / 60;
  return `${diffInMinutes >= 0 ? "+" : "-"}${Math.abs(diffInHours) % 1 === 0 ? Math.abs(diffInHours) : Math.abs(diffInHours).toFixed(1)}h`;
}

function searchItemAccessories(
  statusEmoji: string | undefined,
  statusText: string | undefined,
  statusExpiration: string | null,
  timezone: string,
) {
  const searchMetadata: Array<{ icon: string | Icon; text: string; tooltip?: string | null | undefined }> = [
    {
      icon: convertSlackEmojiToUnicode(statusEmoji ?? ""),
      text: statusText ?? "",
      tooltip: statusExpiration ? String(statusExpiration) : undefined,
    },
  ];

  if (displayExtraMetadata) {
    searchMetadata.push({ icon: Icon.Globe, text: timezone.split("/")[1].replace(/_/g, " ") });

    if (getCoworkerTime(timezone) !== "+0h") {
      searchMetadata.push({ icon: Icon.Clock, text: getCoworkerTime(timezone) });
    }
  }

  return searchMetadata;
}

function Search() {
  const { isAppInstalled, isLoading } = useSlackApp();
  const { data, isLoading: isLoadingChannels } = useChannels();

  const channels = data?.flat();

  const { data: recents, visitItem, resetRanking } = useFrecencySorting(channels, { key: (item) => item.id });

  return (
    <List isLoading={isLoading || isLoadingChannels}>
      {recents.map((item) => {
        const isUser = item.id.startsWith("U");

        if (isUser) {
          const {
            id: userId,
            name,
            icon,
            title,
            statusEmoji,
            statusText,
            statusExpiration,
            teamId: workspaceId,
            conversationId,
            timezone,
          } = item as User;
          return (
            <List.Item
              key={userId}
              title={name}
              subtitle={displayExtraMetadata ? title : undefined}
              icon={icon}
              accessories={searchItemAccessories(statusEmoji, statusText, statusExpiration, timezone)}
              actions={
                <ActionPanel>
                  <OpenChatInSlack
                    {...{ workspaceId, userId, isAppInstalled, conversationId, onAction: () => visitItem(item) }}
                  />

                  <Action.CreateQuicklink
                    quicklink={{
                      name: `Open Chat with ${name}`,
                      ...(isAppInstalled
                        ? { link: `slack://user?team=${workspaceId}&id=${userId}`, application: "Slack" }
                        : { link: `https://app.slack.com/client/${workspaceId}/${conversationId}` }),
                    }}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
                  />

                  <Action.CopyToClipboard
                    title="Copy Huddle Link"
                    content={`https://app.slack.com/huddle/${workspaceId}/${conversationId}`}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
                  />

                  <ActionPanel.Section>
                    <Action
                      icon={Icon.ArrowCounterClockwise}
                      title="Reset Ranking"
                      onAction={() => resetRanking(item)}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        } else {
          const { id: channelId, name, icon, teamId: workspaceId } = item;

          return (
            <List.Item
              key={channelId}
              title={name}
              icon={icon}
              actions={
                <ActionPanel>
                  <OpenChannelInSlack
                    {...{ workspaceId, channelId, isAppInstalled, onAction: () => visitItem(item) }}
                  />

                  <Action.CreateQuicklink
                    quicklink={{
                      name: `Open #${name} Channel`,
                      ...(isAppInstalled
                        ? { link: `slack://channel?team=${workspaceId}&id=${channelId}`, application: "Slack" }
                        : { link: `https://app.slack.com/client/${workspaceId}/${channelId}` }),
                    }}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
                  />

                  <ActionPanel.Section>
                    <Action
                      icon={Icon.ArrowCounterClockwise}
                      title="Reset Ranking"
                      onAction={() => resetRanking(item)}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        }
      })}
    </List>
  );
}

export default withSlackClient(Search);
