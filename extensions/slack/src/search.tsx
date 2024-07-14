// This filename should be named `switch-to-channel.tsx` or something similar
// but it's kept as `search.tsx` as changing the command's name will cause users to lose their keywords and aliases
import { ActionPanel, Action, Icon, List } from "@raycast/api";

import { User, useChannels } from "./shared/client";
import { withSlackClient } from "./shared/withSlackClient";
import { useFrecencySorting } from "@raycast/utils";
import { OpenChannelInSlack, OpenChatInSlack, useSlackApp } from "./shared/OpenInSlack";

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
          const { id: userId, name, icon, teamId: workspaceId, conversationId } = item as User;
          return (
            <List.Item
              key={userId}
              title={name}
              icon={icon}
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
