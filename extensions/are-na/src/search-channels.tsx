import { useEffect, useMemo, useState } from "react";
import { List, Grid, ActionPanel, Action, Alert, Icon, confirmAlert, showToast, Toast } from "@raycast/api";
import { showFailureToast, useCachedPromise, withAccessToken } from "@raycast/utils";
import { useArena } from "./hooks/useArena";
import { useViewMode } from "./hooks/useViewMode";
import type { ApiMeta, Channel, SearchSort } from "./api/types";
import { ChannelView } from "./components/channel";
import { channelIcon, STATUS_ICONS } from "./utils/icons";
import { addRecentQuery, toggleSavedQuery } from "./utils/searchHistory";
import { EditChannelView } from "./components/editChannel";
import { arenaOAuth } from "./api/oauth";
import { getDefaultSort, getPageSize } from "./utils/preferences";

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

function ChannelItemActions({
  channel,
  query,
  mode,
  toggle,
  onSaved,
}: {
  channel: Channel;
  query: string;
  mode: "list" | "grid";
  toggle: () => void;
  onSaved: () => Promise<void>;
}) {
  const arena = useArena();
  return (
    <ActionPanel title={channel.title}>
      <ActionPanel.Section>
        <Action.Push
          icon={{ source: "extension-icon.png" }}
          title="Enter Channel"
          target={<ChannelView channel={channel} />}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <ToggleViewAction mode={mode} toggle={toggle} />
        {channel.can?.update ? (
          <Action.Push icon={Icon.Pencil} title="Edit Channel" target={<EditChannelView channel={channel} />} />
        ) : null}
        {channel.can?.destroy ? (
          <Action
            icon={Icon.Trash}
            title="Delete Channel"
            style={Action.Style.Destructive}
            onAction={async () => {
              const confirmed = await confirmAlert({
                title: "Delete channel?",
                message: "This cannot be undone.",
                primaryAction: {
                  title: "Delete",
                  style: Alert.ActionStyle.Destructive,
                },
              });
              if (!confirmed) return;
              try {
                await arena.channel(channel.slug).delete();
                await showToast({ style: Toast.Style.Success, title: "Channel deleted", message: channel.title });
              } catch (error) {
                showFailureToast(error, { title: "Failed to delete channel" });
              }
            }}
          />
        ) : null}
      </ActionPanel.Section>
      <ActionPanel.Section>
        {channel.slug && <Action.OpenInBrowser url={`https://www.are.na/${channel.owner_slug}/${channel.slug}`} />}
      </ActionPanel.Section>
      <ActionPanel.Section>
        {query ? (
          <Action
            icon={Icon.Star}
            title="Toggle Saved Query"
            onAction={async () => {
              const saved = await toggleSavedQuery(query);
              await onSaved();
              await showToast({
                style: Toast.Style.Success,
                title: saved ? "Saved query" : "Removed saved query",
                message: query,
              });
            }}
          />
        ) : null}
      </ActionPanel.Section>
      <ActionPanel.Section>
        {channel.slug && (
          <Action.CopyToClipboard
            title="Copy Link"
            content={`https://www.are.na/${channel.owner_slug}/${channel.slug}`}
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function Command() {
  const arena = useArena();
  const pageSize = getPageSize();
  const [query, setQuery] = useState("");
  const { mode, toggle } = useViewMode("search-channels", "list");
  const [sort, setSort] = useState<SearchSort>(() => getDefaultSort() as SearchSort);
  const trimmedQuery = query.trim();
  const [listMeta, setListMeta] = useState<ApiMeta | undefined>();
  useEffect(() => {
    if (!trimmedQuery) setListMeta(undefined);
  }, [trimmedQuery]);

  const {
    data: items = [],
    isLoading,
    pagination,
  } = useCachedPromise(
    (q: string, sortArg: SearchSort) =>
      async ({ page }) => {
        const response = await arena.search(q).channels({ page: page + 1, per: pageSize, sort: sortArg });
        if (page === 0) {
          await addRecentQuery(q);
          setListMeta(response.meta);
        }
        const seen = new Set<number>();
        const unique = response.channels.filter((c) => {
          if (seen.has(c.id)) return false;
          seen.add(c.id);
          return true;
        });
        return { data: unique, hasMore: response.meta?.has_more_pages ?? false };
      },
    [trimmedQuery, sort],
    {
      initialData: [],
      keepPreviousData: true,
      execute: trimmedQuery.length > 0,
      failureToastOptions: { title: "Failed to search channels" },
    },
  );

  const uniqueItems = useMemo(() => {
    const seen = new Set<number>();
    return (items ?? []).filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  }, [items]);

  const sectionTitle = listMeta?.total_count ? `Channels (${listMeta.total_count})` : "Channels";
  const sortDropdownItems = [
    { value: "score_desc", title: "Best Match" },
    { value: "updated_at_desc", title: "Recently Updated" },
    { value: "created_at_desc", title: "Recently Created" },
    { value: "name_asc", title: "Name A-Z" },
  ];

  if (mode === "grid") {
    return (
      <Grid
        columns={4}
        isLoading={isLoading}
        pagination={trimmedQuery ? pagination : undefined}
        onSearchTextChange={setQuery}
        searchBarPlaceholder="Search channels"
        searchBarAccessory={
          <Grid.Dropdown tooltip="Sort Channels" value={sort} onChange={(newValue) => setSort(newValue as SearchSort)}>
            {sortDropdownItems.map((item) => (
              <Grid.Dropdown.Item key={item.value} value={item.value} title={item.title} />
            ))}
          </Grid.Dropdown>
        }
      >
        {!query.trim() ? (
          <Grid.EmptyView
            icon={{ source: "extension-icon.png" }}
            title="Search Are.na Channels"
            description="Type a name or topic to get started"
          />
        ) : uniqueItems.length === 0 && isLoading ? (
          <Grid.EmptyView icon={{ source: "extension-icon.png" }} title={`Searching "${query}"...`} />
        ) : uniqueItems.length === 0 ? (
          <Grid.EmptyView title="No channels found" description="Try a different search term" />
        ) : (
          <Grid.Section title={sectionTitle}>
            {uniqueItems.map((channel) => (
              <Grid.Item
                key={channel.id}
                content={channelIcon(channel.title, channel.status, channel.length)}
                title={channel.title}
                subtitle={`${channel.user.full_name} · ${channel.length}`}
                actions={
                  <ChannelItemActions
                    channel={channel}
                    query={query}
                    mode={mode}
                    toggle={toggle}
                    onSaved={async () => undefined}
                  />
                }
              />
            ))}
          </Grid.Section>
        )}
      </Grid>
    );
  }

  return (
    <List
      isLoading={isLoading}
      pagination={trimmedQuery ? pagination : undefined}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search channels"
      searchBarAccessory={
        <List.Dropdown tooltip="Sort Channels" value={sort} onChange={(newValue) => setSort(newValue as SearchSort)}>
          {sortDropdownItems.map((item) => (
            <List.Dropdown.Item key={item.value} value={item.value} title={item.title} />
          ))}
        </List.Dropdown>
      }
    >
      {!query.trim() ? (
        <List.EmptyView
          icon={{ source: "extension-icon.png" }}
          title="Search Are.na Channels"
          description="Type a name or topic to get started"
        />
      ) : uniqueItems.length === 0 && isLoading ? (
        <List.EmptyView icon={{ source: "extension-icon.png" }} title={`Searching "${query}"...`} />
      ) : uniqueItems.length === 0 ? (
        <List.EmptyView title="No channels found" description="Try a different search term" />
      ) : (
        <List.Section title={sectionTitle}>
          {uniqueItems.map((channel) => (
            <List.Item
              key={channel.id}
              icon={STATUS_ICONS[channel.status]}
              title={channel.title}
              accessories={[
                { text: channel.user.full_name, icon: Icon.Person },
                { text: String(channel.length), icon: Icon.AppWindowGrid2x2 },
                { icon: STATUS_ICONS[channel.status] },
              ]}
              actions={
                <ChannelItemActions
                  channel={channel}
                  query={query}
                  mode={mode}
                  toggle={toggle}
                  onSaved={async () => undefined}
                />
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

export default withAccessToken(arenaOAuth)(Command);
