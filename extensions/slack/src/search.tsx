import { ActionPanel, Action, Icon, Image, List } from "@raycast/api";

import { User, onApiError, useChannels, useGroups, useUsers } from "./shared/client";
import { UpdatesModal } from "./shared/UpdatesModal";
import { withSlackClient } from "./shared/withSlackClient";
import { useFrecencySorting } from "@raycast/utils";
import { OpenChannelInSlack, OpenChatInSlack, useSlackApp } from "./shared/OpenInSlack";

function Search() {
  return (
    <UpdatesModal>
      <SlackList />
    </UpdatesModal>
  );
}

function SlackList() {
  const { isAppInstalled, isLoading } = useSlackApp();
  const { data: users, isLoading: isLoadingUsers, error: usersError } = useUsers();
  const { data: channels, isLoading: isLoadingChannels, error: channelsError } = useChannels();
  const { data: groups, isLoading: isLoadingGroups, error: groupsError } = useGroups();

  if (usersError && channelsError && groupsError) {
    onApiError({ exitExtension: true });
  }

  const {
    data: recents,
    visitItem,
    resetRanking,
  } = useFrecencySorting([...(users ?? []), ...(channels ?? []), ...(groups ?? [])], {
    key: (item) => item.id,
  });

  return (
    <List isLoading={isLoadingUsers || isLoadingChannels || isLoadingGroups || isLoading}>
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
          const { id: channelId, name, icon, teamId: workspaceId } = item as User;

          return (
            <List.Item
              key={channelId}
              title={name}
              icon={isUser ? (icon ? { source: icon, mask: Image.Mask.Circle } : Icon.Person) : icon}
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
