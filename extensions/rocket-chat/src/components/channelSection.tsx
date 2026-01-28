import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { Channel } from "../models/user";
import { getConfig } from "../config";

export function ChannelSection({ channels }: { channels: Channel[] }) {
  const config = getConfig();

  return (
    <>
      {channels.length >= 1 && (
        <List.Section title={`Channels ${channels.length.toString()}`}>
          {channels.map((channel) => (
            <List.Item
              key={channel._id}
              icon={`${config.baseUrl}/avatar/room/${channel._id}?size=50`}
              title={channel.name}
              subtitle={channel.belongsTo}
              accessories={[
                {
                  icon: Icon.TwoPeople,
                  text: {
                    value: channel.usersCount.toString(),
                  },
                },
              ]}
              actions={
                <ActionPanel title={channel.name}>
                  <Action.OpenInBrowser title="Chat" url={`${config.baseUrl}/group/${channel.name}`} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </>
  );
}
