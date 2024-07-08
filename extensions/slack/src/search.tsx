import { ActionPanel, Action, Icon, Image, List, getPreferenceValues } from "@raycast/api";
import { User, useChannels } from "./shared/client";
import { withSlackClient } from "./shared/withSlackClient";
import { useFrecencySorting } from "@raycast/utils";
import { OpenChannelInSlack, OpenChatInSlack, useSlackApp } from "./shared/OpenInSlack";
import { convertSlackEmojiToUnicode, getTimeLocale } from "./shared/utils";
import { Preferences } from "./shared/client/WebClient";

const { displayExtraMetadata } = getPreferenceValues<Preferences>();

function getCoworkerTime(coworkerTimeZone: string): string {
  const time = new Date();
  return new Intl.DateTimeFormat(getTimeLocale(), {
    timeZone: coworkerTimeZone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(time);
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
    searchMetadata.push(
      { icon: Icon.Globe, text: timezone.split("/")[1].replace(/_/g, " ") },
      { icon: Icon.Clock, text: getCoworkerTime(timezone) },
    );
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
              icon={icon ? { source: icon, mask: Image.Mask.Circle } : Icon.Person}
              accessories={searchItemAccessories(statusEmoji, statusText, statusExpiration, timezone)}
              actions={
                <ActionPanel>
                  <OpenChatInSlack
                    {...{ workspaceId, userId, isAppInstalled, conversationId, onAction: () => visitItem(item) }}
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
