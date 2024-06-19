import { ActionPanel, Action, Icon, Image, List } from "@raycast/api";

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
              icon={icon ? { source: icon, mask: Image.Mask.Circle } : Icon.Person}
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
