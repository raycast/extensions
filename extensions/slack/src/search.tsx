import { Action, ActionPanel, Image, List } from "@raycast/api";

import { CacheProvider, useChannels, useGroups, useUsers } from "./shared/client";
import { openChannel, openChat } from "./shared/utils";

export default function Command() {
  return (
    <CacheProvider>
      <SlackList />
    </CacheProvider>
  );
}

function SlackList() {
  const { data: users } = useUsers();
  const { data: channels } = useChannels();
  const { data: groups } = useGroups();

  return (
    <List isLoading={!users || !groups || !channels}>
      <List.Section title="Users">
        {users?.map(({ name, id, teamId, icon }) => (
          <List.Item
            key={id}
            title={name}
            icon={icon ? { source: icon, mask: Image.Mask.Circle } : undefined}
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
