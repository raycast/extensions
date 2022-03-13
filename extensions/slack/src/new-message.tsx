import { Action, ActionPanel, Image, List } from "@raycast/api";
import { useEffect, useState } from "react";

import { SlackClient, Channel, Group, User } from "./shared/client";
import { openChannel, openChat } from "./shared/utils";

export default function Command() {
  const [users, setUsers] = useState<User[]>();
  const [channels, setChannels] = useState<Channel[]>();
  const [groups, setGroups] = useState<Group[]>();

  useEffect(() => {
    SlackClient.getUsers().then(setUsers);
    SlackClient.getChannels().then(setChannels);
    SlackClient.getGroups().then(setGroups);
  }, []);

  return (
    <List isLoading={!!users || !!groups || !!channels}>
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
        {channels?.map(({ name, id, teamId }) => (
          <List.Item
            key={id}
            title={name}
            actions={
              <ActionPanel>
                <Action title="Open in Slack" onAction={() => openChannel(teamId, id)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Groups">
        {groups?.map(({ name, id, teamId }) => (
          <List.Item
            key={id}
            title={name}
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
