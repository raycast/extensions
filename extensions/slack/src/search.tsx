// This filename should be named `switch-to-channel.tsx` or something similar
// but it's kept as `search.tsx` as changing the command's name will cause users to lose their keywords and aliases
import {
  ActionPanel,
  Action,
  Icon,
  List,
  Clipboard,
  Detail,
  useNavigation,
  showHUD,
  getPreferenceValues,
} from "@raycast/api";
import { useState } from "react";
import { User, useDirectorySearch, type Channel, type Group } from "./shared/client";
import { withSlackClient } from "./shared/withSlackClient";
import { useCachedState, useFrecencySorting } from "@raycast/utils";
import { OpenChannelInSlack, OpenChatInSlack, useSlackApp } from "./shared/OpenInSlack";
import { convertSlackEmojiToUnicode } from "./shared/utils";
import { toZonedTime } from "date-fns-tz";
import { differenceInMinutes } from "date-fns";
import SendMessage from "./send-message";
import { directMessageAction } from "./shared/directMessageAction";
import { isSlackUserId, mergeVisitedDirectoryItems, rememberVisitedDirectoryItem } from "./shared/client/directory";

type OpenChannelItem = User | Channel | Group;

const { displayExtraMetadata } = getPreferenceValues<Preferences.Search>();

// See OpenInSlack.tsx — `application` hint is mac-only.
const isMac = process.platform === "darwin";

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

function CopyIdAction({ id }: { id: string }) {
  return (
    <Action.CopyToClipboard
      title="Copy ID to Clipboard"
      content={id}
      shortcut={{
        macOS: { modifiers: ["cmd", "shift"], key: "c" },
        Windows: { modifiers: ["ctrl", "shift"], key: "c" },
      }}
    />
  );
}

function Search() {
  const { push } = useNavigation();
  const [searchText, setSearchText] = useState("");
  const [recentItems, setRecentItems] = useCachedState<OpenChannelItem[]>("open-channel-visited-items", []);
  const { isAppInstalled, isLoading } = useSlackApp();
  const { data, isLoading: isLoadingChannels } = useDirectorySearch(searchText);

  const channels = mergeVisitedDirectoryItems(data?.flat(), recentItems, searchText);

  const { data: recents, visitItem, resetRanking } = useFrecencySorting(channels, { key: (item) => item.id });

  const rememberVisit = (item: OpenChannelItem) => {
    setRecentItems((items) => rememberVisitedDirectoryItem(items, item));
    return visitItem(item);
  };

  return (
    <List isLoading={isLoading || isLoadingChannels} filtering={false} throttle onSearchTextChange={setSearchText}>
      {recents.map((item) => {
        const isUser = isSlackUserId(item.id);

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
                    {...{ workspaceId, userId, isAppInstalled, conversationId, onAction: () => rememberVisit(item) }}
                  />

                  <Action.Push
                    title="Send Message"
                    icon={Icon.Message}
                    target={<SendMessage recipient={userId} recipientName={name} />}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                  />

                  {isAppInstalled ? (
                    <Action.CreateQuicklink
                      quicklink={{
                        name: `Open Chat with ${name}`,
                        link: `slack://user?team=${workspaceId}&id=${userId}`,
                        ...(isMac ? { application: "Slack" } : {}),
                      }}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
                    />
                  ) : (
                    <Action
                      title="Create Quicklink"
                      icon={Icon.Link}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
                      onAction={() =>
                        directMessageAction(userId, conversationId, async (id) => {
                          const link = `https://app.slack.com/client/${workspaceId}/${id}`;
                          push(
                            <Detail
                              markdown={`Create a Quicklink to open this Slack conversation in your browser.`}
                              actions={
                                <ActionPanel>
                                  <Action.CreateQuicklink quicklink={{ name: `Open Chat with ${name}`, link }} />
                                </ActionPanel>
                              }
                            />,
                          );
                        })
                      }
                    />
                  )}

                  <Action
                    title="Copy Huddle Link"
                    icon={Icon.Clipboard}
                    onAction={() =>
                      directMessageAction(userId, conversationId, async (id) => {
                        await Clipboard.copy(`https://app.slack.com/huddle/${workspaceId}/${id}`);
                        await showHUD("Copied Huddle link");
                      })
                    }
                    shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
                  />

                  <CopyIdAction id={userId} />

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
                    {...{ workspaceId, channelId, isAppInstalled, onAction: () => rememberVisit(item) }}
                  />

                  <Action.CreateQuicklink
                    quicklink={{
                      name: `Open #${name} Channel`,
                      ...(isAppInstalled
                        ? {
                            link: `slack://channel?team=${workspaceId}&id=${channelId}`,
                            ...(isMac ? { application: "Slack" } : {}),
                          }
                        : { link: `https://app.slack.com/client/${workspaceId}/${channelId}` }),
                    }}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
                  />

                  <CopyIdAction id={channelId} />

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
