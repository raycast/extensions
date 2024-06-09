import { ActionPanel, Icon, Image, List } from "@raycast/api";

import { CacheProvider, onApiError, useChannels, useGroups, useUsers } from "./shared/client";
import { UpdatesModal } from "./shared/UpdatesModal";
import { OpenChannelInSlack, OpenChatInSlack, useSlackApp } from "./shared/OpenInSlack";

export default function Command() {
  return (
    <CacheProvider>
      <UpdatesModal>
        <SlackList />
      </UpdatesModal>
    </CacheProvider>
  );
}

function SlackList() {
  const { isAppInstalled, isLoading } = useSlackApp();
  const { data: users, error: usersError, isValidating: isValidatingUsers } = useUsers();
  const { data: channels, error: channelsError, isValidating: isValidatingChannels } = useChannels();
  const { data: groups, error: groupsError, isValidating: isValidatingGroups } = useGroups();

  if (
    usersError &&
    channelsError &&
    groupsError &&
    !isValidatingUsers &&
    !isValidatingChannels &&
    !isValidatingGroups
  ) {
    onApiError({ exitExtension: true });
  }

  return (
    <List isLoading={isValidatingUsers || isValidatingGroups || isValidatingChannels || isLoading}>
      <List.Section title="Users">
        {users?.map(({ name, id: userId, teamId: workspaceId, icon, conversationId }) => (
          <List.Item
            key={userId}
            title={name}
            icon={icon ? { source: icon, mask: Image.Mask.Circle } : Icon.Person}
            actions={
              <ActionPanel>
                <OpenChatInSlack {...{ workspaceId, userId, isAppInstalled, conversationId }} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title="Channels">
        {channels?.map(({ name, id: channelId, teamId: workspaceId, icon }) => (
          <List.Item
            key={channelId}
            title={name}
            icon={icon}
            actions={
              <ActionPanel>
                <OpenChannelInSlack {...{ workspaceId, channelId, isAppInstalled }} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title="Groups">
        {groups?.map(({ name, id: channelId, teamId: workspaceId, icon }) => (
          <List.Item
            key={channelId}
            title={name}
            icon={icon}
            actions={
              <ActionPanel>
                <OpenChannelInSlack {...{ workspaceId, channelId, isAppInstalled }} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
