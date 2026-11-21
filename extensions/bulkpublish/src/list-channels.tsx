import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { EmptyState } from "./components/EmptyState";
import { CreatePostForm } from "./create-post";
import { APP_URL, Channel, platformLabel } from "./lib/core";
import { useChannels } from "./lib/hooks";
import { channelIcon, platformIcon } from "./lib/ui";
import { PostSearch } from "./search-posts";

export default function Command() {
  const { channels, isLoading, error, revalidate } = useChannels();
  const attention = channels.filter((c) => !c.usable || c.warning);
  const ready = channels.filter((c) => c.usable && !c.warning);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter channels by name or network">
      {error ? (
        <EmptyState error={error} onRetry={revalidate} />
      ) : (
        <>
          <List.Section title="Needs Attention">
            {attention.map((c) => (
              <ChannelItem key={c.id} channel={c} onRefresh={revalidate} />
            ))}
          </List.Section>
          <List.Section title="Connected" subtitle={String(ready.length)}>
            {ready.map((c) => (
              <ChannelItem key={c.id} channel={c} onRefresh={revalidate} />
            ))}
          </List.Section>
          {!isLoading && channels.length === 0 && (
            <List.EmptyView
              icon={Icon.Link}
              title="No Channels Connected"
              description="Connect your social accounts in BulkPublish to start posting."
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser title="Connect a Channel" url={`${APP_URL}/channels`} />
                </ActionPanel>
              }
            />
          )}
        </>
      )}
    </List>
  );
}

function ChannelItem({ channel: c, onRefresh }: { channel: Channel; onRefresh: () => void }) {
  const accessories: List.Item.Accessory[] = [];
  if (c.problem) accessories.push({ tag: { value: c.problem, color: Color.Red } });
  else if (c.warning) accessories.push({ tag: { value: c.warning, color: Color.Yellow } });
  else accessories.push({ icon: { source: Icon.CheckCircle, tintColor: Color.Green }, tooltip: "Ready to post" });

  return (
    <List.Item
      title={c.name}
      subtitle={platformLabel(c.platform)}
      icon={channelIcon(c)}
      keywords={[c.platform, platformLabel(c.platform)]}
      accessories={[{ icon: platformIcon(c.platform), tooltip: platformLabel(c.platform) }, ...accessories]}
      actions={
        <ActionPanel>
          {c.usable ? (
            <Action.Push
              title="Create Post on Channel"
              icon={Icon.Plus}
              target={<CreatePostForm initialChannelIds={[c.id]} navigationTitle={`Post to ${c.name}`} />}
            />
          ) : (
            <Action.OpenInBrowser title="Reconnect in BulkPublish" icon={Icon.Link} url={`${APP_URL}/channels`} />
          )}
          {/* Second action: Raycast gives it ⌘↵, so it takes no custom shortcut. */}
          <Action.Push
            title="Show Posts"
            icon={Icon.List}
            target={<PostSearch channelId={c.id} channelName={c.name} />}
          />
          <Action.OpenInBrowser
            title="Manage Channels in BulkPublish"
            icon={Icon.Gear}
            url={`${APP_URL}/channels`}
            shortcut={Keyboard.Shortcut.Common.Open}
          />
          <Action.CopyToClipboard
            title="Copy Channel ID"
            content={String(c.id)}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={onRefresh}
          />
        </ActionPanel>
      }
    />
  );
}
