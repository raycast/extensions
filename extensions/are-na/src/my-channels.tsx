import { Action, ActionPanel, Grid, Icon, List } from "@raycast/api";
import { showFailureToast, usePromise, withAccessToken } from "@raycast/utils";
import { useArena } from "./hooks/useArena";
import { useViewMode } from "./hooks/useViewMode";
import { ChannelView } from "./components/channel";
import { channelIcon, STATUS_ICONS } from "./utils/icons";
import type { Channel } from "./api/types";
import { arenaOAuth } from "./api/oauth";

function ToggleViewAction({ mode, toggle }: { mode: "list" | "grid"; toggle: () => void }) {
  return (
    <Action
      icon={mode === "list" ? Icon.AppWindowGrid2x2 : Icon.List}
      title={mode === "list" ? "View as Grid" : "View as List"}
      shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
      onAction={toggle}
    />
  );
}

function ChannelActions({ channel, mode, toggle }: { channel: Channel; mode: "list" | "grid"; toggle: () => void }) {
  return (
    <ActionPanel>
      <Action.Push title="Enter Channel" target={<ChannelView channel={channel} />} />
      <Action.OpenInBrowser url={`https://www.are.na/${channel.owner_slug}/${channel.slug}`} />
      <ToggleViewAction mode={mode} toggle={toggle} />
      <Action.CopyToClipboard
        title="Copy Link"
        content={`https://www.are.na/${channel.owner_slug}/${channel.slug}`}
        shortcut={{ modifiers: ["cmd"], key: "." }}
      />
    </ActionPanel>
  );
}

function MyChannelsCommand() {
  const arena = useArena();
  const { mode, toggle } = useViewMode("my-channels", "list");

  const { data, isLoading, revalidate } = usePromise(async (): Promise<Channel[]> => {
    const me = await arena.me();
    return arena.user(me.slug || me.id).channels({ page: 1, per: 100, sort: "updated_at_desc" });
  });

  const channels = data ?? [];

  if (mode === "grid") {
    return (
      <Grid columns={4} isLoading={isLoading} searchBarPlaceholder="Filter channels...">
        {isLoading && channels.length === 0 ? (
          <Grid.EmptyView icon={{ source: "extension-icon.png" }} title="Loading your channels..." />
        ) : channels.length === 0 ? (
          <Grid.EmptyView
            icon={{ source: "extension-icon.png" }}
            title="No channels found"
            description="You haven't created any channels yet."
            actions={
              <ActionPanel>
                <Action
                  title="Retry"
                  icon={Icon.ArrowClockwise}
                  onAction={async () => {
                    try {
                      revalidate();
                    } catch (error) {
                      showFailureToast(error, { title: "Failed to fetch channels" });
                    }
                  }}
                />
              </ActionPanel>
            }
          />
        ) : (
          channels.map((channel) => (
            <Grid.Item
              key={channel.id}
              content={channelIcon(channel.title, channel.status, channel.length)}
              title={channel.title}
              subtitle={channel.status}
              actions={<ChannelActions channel={channel} mode={mode} toggle={toggle} />}
            />
          ))
        )}
      </Grid>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter channels...">
      {isLoading && channels.length === 0 ? (
        <List.EmptyView icon={{ source: "extension-icon.png" }} title="Loading your channels..." />
      ) : channels.length === 0 ? (
        <List.EmptyView
          icon={{ source: "extension-icon.png" }}
          title="No channels found"
          description="You haven't created any channels yet."
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={async () => {
                  try {
                    revalidate();
                  } catch (error) {
                    showFailureToast(error, { title: "Failed to fetch channels" });
                  }
                }}
              />
            </ActionPanel>
          }
        />
      ) : (
        channels.map((channel) => (
          <List.Item
            key={channel.id}
            icon={STATUS_ICONS[channel.status]}
            title={channel.title}
            accessories={[
              { text: channel.status, icon: STATUS_ICONS[channel.status] },
              { text: `${channel.length}`, icon: Icon.AppWindowGrid2x2 },
            ]}
            actions={<ChannelActions channel={channel} mode={mode} toggle={toggle} />}
          />
        ))
      )}
    </List>
  );
}

export default withAccessToken(arenaOAuth)(MyChannelsCommand);
