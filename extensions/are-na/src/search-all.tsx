import { Action, ActionPanel, Grid, Icon, List } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import type { Block, Channel, SearchResponse, SearchSort, User } from "./api/types";
import { useArena } from "./hooks/useArena";
import { useViewMode } from "./hooks/useViewMode";
import { useCachedPromise, withAccessToken } from "@raycast/utils";
import { BlockActions } from "./components/BlockActions";
import { ChannelView } from "./components/channel";
import { channelIcon, getIconSource, userIcon } from "./utils/icons";
import { addRecentQuery, getRecentQueries, getSavedQueries, toggleSavedQuery } from "./utils/searchHistory";
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

function mergeSearchPages(pages: SearchResponse[]): SearchResponse {
  const merged: SearchResponse = { ...pages[0], channels: [], blocks: [], users: [] };
  const chSeen = new Set<number>();
  const blSeen = new Set<number>();
  const uSeen = new Set<number>();
  for (const p of pages) {
    for (const c of p.channels) {
      if (chSeen.has(c.id)) continue;
      chSeen.add(c.id);
      merged.channels.push(c);
    }
    for (const b of p.blocks) {
      if (b.id != null) {
        if (blSeen.has(b.id)) continue;
        blSeen.add(b.id);
      }
      merged.blocks.push(b);
    }
    for (const u of p.users) {
      if (uSeen.has(u.id)) continue;
      uSeen.add(u.id);
      merged.users.push(u);
    }
    merged.meta = p.meta;
  }
  return merged;
}

function SearchAllCommand() {
  const arena = useArena();
  const pageSize = getPageSize();
  const { mode, toggle } = useViewMode("search-all", "list");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SearchSort>(() => getDefaultSort() as SearchSort);
  const trimmedQuery = query.trim();
  const [recentQueries, setRecentQueries] = useState<string[]>([]);
  const [savedQueries, setSavedQueries] = useState<string[]>([]);

  useEffect(() => {
    async function loadSavedData() {
      const [recent, saved] = await Promise.all([getRecentQueries(), getSavedQueries()]);
      setRecentQueries(recent);
      setSavedQueries(saved);
    }
    void loadSavedData();
  }, []);

  const {
    data: pageChunks = [],
    isLoading,
    pagination,
  } = useCachedPromise(
    (q: string, sortArg: SearchSort) =>
      async ({ page }) => {
        const response = await arena.search(q).all({ page: page + 1, per: pageSize, sort: sortArg });
        if (page === 0) {
          await addRecentQuery(q);
          setRecentQueries(await getRecentQueries());
        }
        return { data: [response], hasMore: response.meta?.has_more_pages ?? false };
      },
    [trimmedQuery, sort],
    {
      initialData: [],
      keepPreviousData: true,
      execute: trimmedQuery.length > 0,
      failureToastOptions: { title: "Failed to search Are.na" },
    },
  );

  const result = useMemo(() => (pageChunks?.length ? mergeSearchPages(pageChunks) : null), [pageChunks]);

  async function onToggleSavedQuery(value: string) {
    await toggleSavedQuery(value);
    setSavedQueries(await getSavedQueries());
  }

  const hasResults = result && (result.channels.length > 0 || result.blocks.length > 0 || result.users.length > 0);
  const hasQuery = query.trim().length > 0;
  const channelCount = result?.channels.length ?? 0;
  const blockCount = result?.blocks.length ?? 0;
  const userCount = result?.users.length ?? 0;

  const sortDropdownItems = [
    { value: "score_desc", title: "Best Match" },
    { value: "updated_at_desc", title: "Recently Updated" },
    { value: "created_at_desc", title: "Recently Created" },
    { value: "connections_count_desc", title: "Most Connected" },
  ];

  if (mode === "grid") {
    return (
      <Grid
        columns={4}
        isLoading={isLoading}
        pagination={trimmedQuery ? pagination : undefined}
        onSearchTextChange={setQuery}
        searchBarPlaceholder="Search channels, blocks, and users"
        searchBarAccessory={
          <Grid.Dropdown tooltip="Sort Results" value={sort} onChange={(newValue) => setSort(newValue as SearchSort)}>
            {sortDropdownItems.map((item) => (
              <Grid.Dropdown.Item key={item.value} value={item.value} title={item.title} />
            ))}
          </Grid.Dropdown>
        }
      >
        {!hasQuery ? (
          <>
            {savedQueries.length > 0 ? (
              <Grid.Section title="Saved Searches">
                {savedQueries.map((item) => (
                  <Grid.Item
                    key={`saved-${item}`}
                    content={{ source: Icon.Star, tintColor: { light: "#f59e0b", dark: "#fbbf24" } }}
                    title={item}
                    actions={
                      <ActionPanel>
                        <Action title="Search This Query" onAction={() => setQuery(item)} />
                        <Action
                          title="Remove Saved Query"
                          icon={Icon.Trash}
                          onAction={() => onToggleSavedQuery(item)}
                        />
                        <ToggleViewAction mode={mode} toggle={toggle} />
                      </ActionPanel>
                    }
                  />
                ))}
              </Grid.Section>
            ) : null}
            {recentQueries.length > 0 ? (
              <Grid.Section title="Recent Searches">
                {recentQueries.map((item) => (
                  <Grid.Item
                    key={`recent-${item}`}
                    content={{ source: Icon.Clock }}
                    title={item}
                    actions={
                      <ActionPanel>
                        <Action title="Search This Query" onAction={() => setQuery(item)} />
                        <Action title="Save Query" icon={Icon.Star} onAction={() => onToggleSavedQuery(item)} />
                        <ToggleViewAction mode={mode} toggle={toggle} />
                      </ActionPanel>
                    }
                  />
                ))}
              </Grid.Section>
            ) : null}
            {savedQueries.length === 0 && recentQueries.length === 0 ? (
              <Grid.EmptyView
                icon={{ source: "extension-icon.png" }}
                title="Search Are.na"
                description="Type to search channels, blocks, and users"
              />
            ) : null}
          </>
        ) : isLoading && !hasResults ? (
          <Grid.EmptyView icon={{ source: "extension-icon.png" }} title={`Searching "${query}"...`} />
        ) : !hasResults ? (
          <Grid.EmptyView title="No results found" description="Try a different search term" />
        ) : (
          <>
            {channelCount > 0 ? (
              <Grid.Section title={`Channels (${channelCount})`}>
                {result!.channels.map((channel: Channel) => (
                  <Grid.Item
                    key={`channel-${channel.id}`}
                    content={channelIcon(channel.title, channel.status, channel.length)}
                    title={channel.title}
                    subtitle={channel.user.full_name}
                    actions={
                      <ActionPanel>
                        <Action.Push title="Enter Channel" target={<ChannelView channel={channel} />} />
                        <Action.OpenInBrowser url={`https://www.are.na/${channel.owner_slug}/${channel.slug}`} />
                        <ToggleViewAction mode={mode} toggle={toggle} />
                        <Action
                          title="Toggle Saved Query"
                          icon={Icon.Star}
                          onAction={() => onToggleSavedQuery(query)}
                        />
                      </ActionPanel>
                    }
                  />
                ))}
              </Grid.Section>
            ) : null}

            {blockCount > 0 ? (
              <Grid.Section title={`Blocks (${blockCount})`}>
                {result!.blocks.map((block: Block) => (
                  <Grid.Item
                    key={`block-${block.id}`}
                    content={getIconSource(block)}
                    title={block.title || block.generated_title || `Block ${block.id}`}
                    subtitle={block.class}
                    actions={
                      <BlockActions
                        block={block}
                        extraActions={
                          <ActionPanel.Section>
                            <ToggleViewAction mode={mode} toggle={toggle} />
                            <Action
                              title="Toggle Saved Query"
                              icon={Icon.Star}
                              onAction={() => onToggleSavedQuery(query)}
                            />
                          </ActionPanel.Section>
                        }
                      />
                    }
                  />
                ))}
              </Grid.Section>
            ) : null}

            {userCount > 0 ? (
              <Grid.Section title={`Users (${userCount})`}>
                {result!.users.map((user: User) => (
                  <Grid.Item
                    key={`user-${user.id}`}
                    content={userIcon(user)}
                    title={user.full_name}
                    subtitle={`@${user.slug}`}
                    actions={
                      <ActionPanel>
                        <Action.OpenInBrowser url={`https://www.are.na/${user.slug}`} />
                        <ToggleViewAction mode={mode} toggle={toggle} />
                        <Action
                          title="Toggle Saved Query"
                          icon={Icon.Star}
                          onAction={() => onToggleSavedQuery(query)}
                        />
                      </ActionPanel>
                    }
                  />
                ))}
              </Grid.Section>
            ) : null}
          </>
        )}
      </Grid>
    );
  }

  return (
    <List
      isLoading={isLoading}
      pagination={trimmedQuery ? pagination : undefined}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search channels, blocks, and users"
      searchBarAccessory={
        <List.Dropdown tooltip="Sort Results" value={sort} onChange={(newValue) => setSort(newValue as SearchSort)}>
          {sortDropdownItems.map((item) => (
            <List.Dropdown.Item key={item.value} value={item.value} title={item.title} />
          ))}
        </List.Dropdown>
      }
    >
      {!hasQuery ? (
        <>
          <List.Section title="Saved Searches">
            {savedQueries.length ? (
              savedQueries.map((item) => (
                <List.Item
                  key={`saved-${item}`}
                  icon={Icon.Star}
                  title={item}
                  actions={
                    <ActionPanel>
                      <Action title="Search This Query" onAction={() => setQuery(item)} />
                      <Action title="Remove Saved Query" icon={Icon.Trash} onAction={() => onToggleSavedQuery(item)} />
                      <ToggleViewAction mode={mode} toggle={toggle} />
                    </ActionPanel>
                  }
                />
              ))
            ) : (
              <List.Item icon={Icon.Star} title="No saved searches yet" />
            )}
          </List.Section>
          <List.Section title="Recent Searches">
            {recentQueries.length ? (
              recentQueries.map((item) => (
                <List.Item
                  key={`recent-${item}`}
                  icon={Icon.Clock}
                  title={item}
                  actions={
                    <ActionPanel>
                      <Action title="Search This Query" onAction={() => setQuery(item)} />
                      <Action title="Save Query" icon={Icon.Star} onAction={() => onToggleSavedQuery(item)} />
                      <ToggleViewAction mode={mode} toggle={toggle} />
                    </ActionPanel>
                  }
                />
              ))
            ) : (
              <List.Item icon={Icon.Clock} title="No recent searches yet" />
            )}
          </List.Section>
        </>
      ) : isLoading && !hasResults ? (
        <List.EmptyView icon={{ source: "extension-icon.png" }} title={`Searching "${query}"...`} />
      ) : !hasResults && !isLoading ? (
        <List.EmptyView title="No results found" description="Try a different search term" />
      ) : null}

      {channelCount > 0 ? (
        <List.Section title={`Channels (${channelCount})`}>
          {result!.channels.map((channel: Channel) => (
            <List.Item
              key={`channel-${channel.id}`}
              icon={Icon.AppWindowGrid2x2}
              title={channel.title}
              subtitle={channel.user.full_name}
              accessories={[{ text: `${channel.length}` }]}
              actions={
                <ActionPanel>
                  <Action.Push title="Enter Channel" target={<ChannelView channel={channel} />} />
                  <Action.OpenInBrowser url={`https://www.are.na/${channel.owner_slug}/${channel.slug}`} />
                  <ToggleViewAction mode={mode} toggle={toggle} />
                  <Action title="Toggle Saved Query" icon={Icon.Star} onAction={() => onToggleSavedQuery(query)} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : null}

      {blockCount > 0 ? (
        <List.Section title={`Blocks (${blockCount})`}>
          {result!.blocks.map((block: Block) => (
            <List.Item
              key={`block-${block.id}`}
              icon={Icon.Document}
              title={block.title || block.generated_title || `Block ${block.id}`}
              subtitle={block.class}
              actions={
                <BlockActions
                  block={block}
                  extraActions={
                    <ActionPanel.Section>
                      <ToggleViewAction mode={mode} toggle={toggle} />
                      <Action title="Toggle Saved Query" icon={Icon.Star} onAction={() => onToggleSavedQuery(query)} />
                    </ActionPanel.Section>
                  }
                />
              }
            />
          ))}
        </List.Section>
      ) : null}

      {userCount > 0 ? (
        <List.Section title={`Users (${userCount})`}>
          {result!.users.map((user: User) => (
            <List.Item
              key={`user-${user.id}`}
              icon={userIcon(user)}
              title={user.full_name}
              subtitle={`@${user.slug}`}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={`https://www.are.na/${user.slug}`} />
                  <ToggleViewAction mode={mode} toggle={toggle} />
                  <Action title="Toggle Saved Query" icon={Icon.Star} onAction={() => onToggleSavedQuery(query)} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}

export default withAccessToken(arenaOAuth)(SearchAllCommand);
