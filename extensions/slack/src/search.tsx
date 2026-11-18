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
import { User, useDirectorySearch, useMe, type Channel, type Group } from "./shared/client";
import { withSlackClient } from "./shared/withSlackClient";
import { useCachedState, useFrecencySorting } from "@raycast/utils";
import { OpenChannelInSlack, OpenChatInSlack, RetrySlackConnection, useSlackApp } from "./shared/OpenInSlack";
import { getStatusEmoji, getTimezoneMetadata } from "./shared/client/presentation";
import SendMessage from "./send-message";
import { directMessageAction } from "./shared/directMessageAction";
import {
  isSlackUserId,
  mergeVisitedDirectoryItems,
  rememberVisitedDirectoryItem,
  visitedDirectoryItemsCacheKey,
  visitedDirectoryItemsForWorkspace,
} from "./shared/client/directory";

type OpenChannelItem = User | Channel | Group;

const { displayExtraMetadata } = getPreferenceValues<Preferences.Search>();

function searchItemAccessories(
  statusEmoji: string | undefined,
  statusText: string | undefined,
  statusExpiration: string | null,
  timezone: string,
) {
  const searchMetadata: List.Item.Accessory[] = [];
  const icon = getStatusEmoji(statusEmoji);
  if (icon || statusText) {
    searchMetadata.push({
      icon,
      text: statusText ?? "",
      tooltip: statusExpiration ? String(statusExpiration) : undefined,
    });
  }

  if (displayExtraMetadata) {
    const metadata = getTimezoneMetadata(timezone);
    if (metadata) {
      searchMetadata.push({ icon: Icon.Globe, text: metadata.name });
      if (metadata.offset) searchMetadata.push({ icon: Icon.Clock, text: metadata.offset });
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
  const { data: me, isLoading: isLoadingMe, error: workspaceError, revalidate: retryWorkspace } = useMe();
  const workspaceId = me?.teamId;
  const [recentItems, setRecentItems] = useCachedState<OpenChannelItem[]>(
    visitedDirectoryItemsCacheKey(me?.teamId),
    [],
  );
  const { isAppInstalled, isLoading } = useSlackApp();
  const { data, isLoading: isLoadingChannels } = useDirectorySearch(searchText);

  const channels = mergeVisitedDirectoryItems(
    data?.flat(),
    visitedDirectoryItemsForWorkspace(recentItems, me?.teamId),
    searchText,
  );

  const {
    data: recents,
    visitItem,
    resetRanking,
  } = useFrecencySorting(channels, {
    key: (item) => item.id,
    namespace: me?.teamId,
  });

  const rememberVisit = (item: OpenChannelItem) => {
    if (me?.teamId) {
      setRecentItems((items) => rememberVisitedDirectoryItem(items, item));
    }
    return visitItem(item);
  };

  return (
    <List
      isLoading={isLoading || isLoadingChannels || isLoadingMe}
      actions={
        workspaceError || !workspaceId ? (
          <ActionPanel>
            <RetrySlackConnection retry={retryWorkspace} />
          </ActionPanel>
        ) : undefined
      }
      filtering={false}
      throttle
      onSearchTextChange={setSearchText}
    >
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
                  {workspaceId ? (
                    <OpenChatInSlack
                      {...{ workspaceId, userId, isAppInstalled, conversationId, onAction: () => rememberVisit(item) }}
                    />
                  ) : (
                    <RetrySlackConnection retry={retryWorkspace} />
                  )}

                  <Action.Push
                    title="Send Message"
                    icon={Icon.Message}
                    target={<SendMessage recipient={userId} recipientName={name} />}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                  />

                  {workspaceId &&
                    (isAppInstalled ? (
                      <Action.CreateQuicklink
                        quicklink={{
                          name: `Open Chat with ${name}`,
                          link: `slack://user?team=${workspaceId}&id=${userId}`,
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
                    ))}

                  {workspaceId && (
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
                  )}

                  <CopyIdAction id={userId} />

                  <ActionPanel.Section>
                    {workspaceError && workspaceId ? <RetrySlackConnection retry={retryWorkspace} /> : null}
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
          const { id: channelId, name, icon } = item;

          return (
            <List.Item
              key={channelId}
              title={name}
              icon={icon}
              actions={
                <ActionPanel>
                  {workspaceId ? (
                    <OpenChannelInSlack
                      {...{ workspaceId, channelId, isAppInstalled, onAction: () => rememberVisit(item) }}
                    />
                  ) : (
                    <RetrySlackConnection retry={retryWorkspace} />
                  )}

                  {workspaceId && (
                    <Action.CreateQuicklink
                      quicklink={{
                        name: `Open #${name} Channel`,
                        ...(isAppInstalled
                          ? {
                              link: `slack://channel?team=${workspaceId}&id=${channelId}`,
                            }
                          : { link: `https://app.slack.com/client/${workspaceId}/${channelId}` }),
                      }}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
                    />
                  )}

                  <CopyIdAction id={channelId} />

                  <ActionPanel.Section>
                    {workspaceError && workspaceId ? <RetrySlackConnection retry={retryWorkspace} /> : null}
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
