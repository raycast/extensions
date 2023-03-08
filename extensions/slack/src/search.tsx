import { Action, ActionPanel, Icon, Image, List } from "@raycast/api";

import { CacheProvider, onApiError, useChannels, useGroups, useUsers } from "./shared/client";
import { UpdatesModal } from "./shared/UpdatesModal";
import { openChannel, openChat } from "./shared/utils";

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
        {users?.map(({ name, id, teamId, icon }) => (
          <List.Item
            key={id}
            title={name}
            icon={icon ? { source: icon, mask: Image.Mask.Circle } : Icon.Person}
            actions={
              <ActionPanel>
                <Action title="Open in Slack" onAction={() => openChat(teamId, id)} />
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
                <Action title="Open in Slack" onAction={() => openChannel(teamId, id)} />
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
                <Action title="Open in Slack" onAction={() => openChannel(teamId, id)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
