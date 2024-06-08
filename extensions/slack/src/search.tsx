import { ActionPanel, Icon, Image, List } from "@raycast/api";

import { CacheProvider, onApiError, useChannels, useGroups, useUsers } from "./shared/client";
import { UpdatesModal } from "./shared/UpdatesModal";
import { OpenChannelInSlack, OpenChatInSlack } from "./shared/OpenInSlack";

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
    <List isLoading={isValidatingUsers || isValidatingGroups || isValidatingChannels}>
      <List.Section title="Users">
        {users?.map(({ name, id, teamId, icon, conversationId }) => (
          <List.Item
            key={id}
            title={name}
            icon={icon ? { source: icon, mask: Image.Mask.Circle } : Icon.Person}
            actions={
              <ActionPanel>
                <OpenChatInSlack workspaceId={teamId} userId={id} conversationId={conversationId} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title="Channels">
        {channels?.map(({ name, id, teamId, icon }) => (
          <List.Item
            key={id}
            title={name}
            icon={icon}
            actions={
              <ActionPanel>
                <OpenChannelInSlack workspaceId={teamId} channelId={id} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title="Groups">
        {groups?.map(({ name, id, teamId, icon }) => (
          <List.Item
            key={id}
            title={name}
            icon={icon}
            actions={
              <ActionPanel>
                <OpenChannelInSlack workspaceId={teamId} channelId={id} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
