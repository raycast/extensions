import {
  List,
  Icon,
  Color,
  Detail,
  Action,
  ActionPanel,
  useNavigation,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getAccount, getChannels } from "./utils/buffer-api";
import { Channel } from "./utils/types";
import { serviceIcon, serviceName } from "./utils/helpers";

function ChannelDetail({ channel }: { channel: Channel }) {
  const markdown = `
# ${serviceIcon(channel.service)} ${channel.displayName || channel.name}

| Field | Value |
|-------|-------|
| Platform | ${serviceName(channel.service)} |
| Type | ${channel.type || "—"} |
| Timezone | ${channel.timezone || "—"} |
| Queue | ${channel.isQueuePaused ? "Paused" : "Active"} |
| Status | ${channel.isDisconnected ? "⚠️ Disconnected" : channel.isLocked ? "🔒 Locked" : "✅ Active"} |
| External Link | ${channel.externalLink || "—"} |
`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={channel.displayName || channel.name}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open Buffer"
            url="https://publish.buffer.com"
            icon={Icon.Globe}
          />
          {channel.externalLink && (
            <Action.OpenInBrowser
              title="Open Channel"
              url={channel.externalLink}
              icon={Icon.Link}
            />
          )}
          <Action.CopyToClipboard
            title="Copy Channel Id"
            content={channel.id}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}

export default function Channels() {
  const { push } = useNavigation();

  const {
    data: account,
    isLoading: loadingAccount,
    error: accountError,
  } = usePromise(getAccount);

  const orgId = account?.organizations?.[0]?.id;

  const {
    data: channels,
    isLoading: loadingChannels,
    error: channelsError,
  } = usePromise(async (id?: string) => (id ? getChannels(id) : []), [orgId]);

  const error = accountError ?? channelsError;

  if (error) {
    return (
      <Detail
        markdown={`## ❌ Error\n\n${error.message}\n\nCheck your **Buffer Access Token** in Raycast preferences.`}
      />
    );
  }

  const connected = channels?.filter((c) => !c.isDisconnected) ?? [];
  const disconnected = channels?.filter((c) => c.isDisconnected) ?? [];

  return (
    <List
      isLoading={loadingAccount || loadingChannels}
      navigationTitle="Buffer Channels"
    >
      {connected.length > 0 && (
        <List.Section title="Connected" subtitle={`${connected.length}`}>
          {connected.map((channel) => (
            <List.Item
              key={channel.id}
              title={channel.displayName || channel.name}
              subtitle={serviceName(channel.service)}
              icon={serviceIcon(channel.service)}
              accessories={
                [
                  channel.isQueuePaused
                    ? {
                        icon: { source: Icon.Pause, tintColor: Color.Yellow },
                        tooltip: "Queue Paused",
                      }
                    : undefined,
                  channel.isLocked
                    ? {
                        icon: { source: Icon.Lock, tintColor: Color.Orange },
                        tooltip: "Locked",
                      }
                    : {
                        icon: {
                          source: Icon.CheckCircle,
                          tintColor: Color.Green,
                        },
                        tooltip: "Active",
                      },
                ].filter(Boolean) as List.Item.Accessory[]
              }
              actions={
                <ActionPanel>
                  <Action
                    title="View Details"
                    icon={Icon.Eye}
                    onAction={() => push(<ChannelDetail channel={channel} />)}
                  />
                  {channel.externalLink && (
                    <Action.OpenInBrowser
                      title="Open Channel"
                      url={channel.externalLink}
                      icon={Icon.Link}
                    />
                  )}
                  <Action.OpenInBrowser
                    title="Open Buffer"
                    url="https://publish.buffer.com"
                    icon={Icon.Globe}
                  />
                  <Action.CopyToClipboard
                    title="Copy Channel Id"
                    content={channel.id}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      {disconnected.length > 0 && (
        <List.Section title="Disconnected" subtitle={`${disconnected.length}`}>
          {disconnected.map((channel) => (
            <List.Item
              key={channel.id}
              title={channel.displayName || channel.name}
              subtitle={serviceName(channel.service)}
              icon={{
                source: serviceIcon(channel.service),
                tintColor: Color.SecondaryText,
              }}
              accessories={[
                {
                  icon: { source: Icon.XMarkCircle, tintColor: Color.Red },
                  tooltip: "Disconnected",
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    title="Reconnect Channel"
                    url="https://publish.buffer.com/channels"
                    icon={Icon.Globe}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      {!loadingAccount && !loadingChannels && !channels?.length && (
        <List.EmptyView
          title="No channels found"
          description="Connect a social media channel in Buffer first."
          icon={Icon.Link}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Connect Channel"
                url="https://publish.buffer.com/channels"
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
