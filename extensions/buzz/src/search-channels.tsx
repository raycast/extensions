import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getClient } from "./lib/preferences";
import { ErrorView } from "./components/error-view";
import { ChannelMessages } from "./components/channel-messages";
import { buildChannelLink } from "./lib/buzz-link";

export default function Command() {
  const { isLoading, data, error } = usePromise(async () => {
    const client = getClient();
    const channels = await client.listChannels();
    return { client, channels };
  });

  if (error) {
    return <ErrorView error={error} />;
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter channels">
      {/* Raycast's native filtering is on here (no onSearchTextChange), so this
          view also covers "the filter matched nothing", a state this command
          cannot see. Adding onSearchTextChange to tell the two apart would
          silently turn that filtering off, so the copy is neutral instead of
          claiming the relay has no channels when it may have plenty. */}
      <List.EmptyView
        title="No channels to show"
        description="This relay has no channels, or none match the current filter."
      />
      {/* Guarded once, on `data` itself, rather than per row: inside the map
          `data` is necessarily present, so `data.client` needs no second hop. */}
      {data &&
        data.channels.map((channel) => (
          <List.Item
            key={channel.id}
            title={channel.name || channel.id}
            subtitle={channel.about}
            actions={
              <ActionPanel>
                {/* channel.id has no native buzz://channel link; buildChannelLink anchors it
                    to a message that cannot exist, and Buzz falls back to opening the channel. */}
                <Action.Open title="Open in Buzz" target={buildChannelLink(channel.id)} icon={Icon.AppWindow} />
                <Action.Push
                  title="Show Messages"
                  target={<ChannelMessages client={data.client} channel={channel} />}
                />
                <Action.CopyToClipboard title="Copy Channel ID" content={channel.id} />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
