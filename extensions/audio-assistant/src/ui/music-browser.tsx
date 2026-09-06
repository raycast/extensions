import { Action, ActionPanel, Grid, Icon, List, openExtensionPreferences, useNavigation } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import type { Album, Artist, Item, Library, View } from "../domain/model";
import { PlayerDetail, PlayerSections } from "./player-sections";
import { albumTrackOrder, itemKey } from "../domain/policy";
import { ItemActions } from "./item-actions";
import { reportError } from "./feedback";
import { SessionRoute, useMusic } from "./session";
import { SearchPager } from "../services/search-pager";
import { restoreDefaultShortcuts, shortcuts } from "./shortcuts";

const views: { value: View; title: string }[] = [
  { value: "all", title: "All" },
  { value: "players", title: "Players" },
  { value: "tracks", title: "Tracks" },
  { value: "artists", title: "Artists" },
  { value: "albums", title: "Albums" },
];
function icon(item: Item) {
  return item.kind === "player"
    ? Icon.Speaker
    : item.kind === "artist"
      ? Icon.Person
      : item.kind === "album"
        ? Icon.Cd
        : Icon.Music;
}
function thumbnail(item: Item) {
  const fallback = icon(item);
  return item.kind !== "player" && item.artwork ? { source: item.artwork, fallback } : fallback;
}
function subtitle(item: Item) {
  return item.kind === "player"
    ? `${item.provider} · ${item.available ? item.state : "Offline"}`
    : "artist" in item
      ? item.artist
      : undefined;
}

export function MusicBrowser({ collection }: { collection?: Artist | Album }) {
  const { service, players, queues, activeId, revision, loading, busy, bridge, run, refresh } = useMusic();
  const { push } = useNavigation();
  const [view, setView] = useState<View>("all");
  const collectionCache = useRef<{ key: string; library: Library } | undefined>(undefined);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [searching, setSearching] = useState(true);
  const [error, setError] = useState<string>();
  const [hasMore, setHasMore] = useState(false);
  const pager = useRef<SearchPager | undefined>(undefined);
  const changeView = (value: string) => {
    pager.current?.dispose();
    setItems([]);
    setHasMore(false);
    setSearching(true);
    setView(value as View);
  };
  const searchRevision = collection || error ? revision : 0;
  useEffect(() => {
    const abort = new AbortController();
    setSearching(true);
    setError(undefined);
    setHasMore(false);
    if (view === "players" && !collection) {
      setItems([]);
      setSearching(false);
      return;
    }
    const nextPager = new SearchPager(
      (request, signal) => service.search(request, signal),
      { view, query, limit: 100 },
      (state) => {
        setItems(state.items);
        setSearching(state.loading);
        setHasMore(state.hasMore && !state.error);
        setError(state.error ? "Could not load music. Use Refresh to retry." : undefined);
        if (state.error) void reportError(state.error);
        if (!state.loading && state.warnings?.length) void reportError(new Error(state.warnings.join(" ")));
      },
    );
    pager.current = nextPager;
    const timer = setTimeout(
      () => {
        if (!collection) {
          void nextPager.loadMore();
          return;
        }
        const key = `${itemKey(collection)}:${revision}`;
        const request = (
          collectionCache.current?.key === key
            ? Promise.resolve(collectionCache.current.library)
            : service.browse(collection, abort.signal).then((library) => {
                if (!abort.signal.aborted) collectionCache.current = { key, library };
                return library;
              })
        ).then((library) =>
          [
            ...(collection.kind === "album" ? albumTrackOrder(library.tracks) : library.tracks),
            ...library.albums,
          ].filter((item) => `${item.name} ${item.artist}`.toLowerCase().includes(query.toLowerCase())),
        );
        void request
          .then((results) => {
            if (!abort.signal.aborted) setItems(results);
          })
          .catch((reason: unknown) => {
            if (!abort.signal.aborted) {
              setError("Could not load music. Use Refresh to retry.");
              void reportError(reason);
            }
          })
          .finally(() => {
            if (!abort.signal.aborted) setSearching(false);
          });
      },
      query ? 200 : 0,
    );
    return () => {
      clearTimeout(timer);
      abort.abort();
      nextPager.dispose();
    };
  }, [service, view, query, collection, searchRevision]);
  const openCollection = (item: Artist | Album) =>
    push(
      <SessionRoute sessionBridge={bridge}>
        <MusicBrowser collection={item} />
      </SessionRoute>,
    );
  const active = players.find((p) => p.id === activeId);
  const queue = queues.find((q) => q.id === active?.queueId);
  const current =
    queue?.currentIndex === null || queue?.currentIndex === undefined ? undefined : queue.entries[queue.currentIndex];
  const title = `${service.mode === "demo" ? "Demo · " : ""}${collection?.name ?? "Music"} · ${active ? active.name : "Select a Player"}${current ? ` · ${current.track.name}` : ""}`;
  const common = {
    navigationTitle: title,
    isLoading: loading || busy || searching,
    searchText: query,
    onSearchTextChange: setQuery,
    searchBarPlaceholder: "Search players, artists, tracks, albums…",
    filtering: false as const,
    throttle: true,
    pagination:
      collection || view === "players"
        ? undefined
        : {
            hasMore,
            pageSize: 100,
            onLoadMore: () => {
              void pager.current?.loadMore();
            },
          },
  };
  const actions = (item?: Item) => <ItemActions item={item} openCollection={openCollection} />;
  const emptyActions = (
    <ActionPanel>
      <ActionPanel.Section title="Workspace">
        <Action title="Refresh" icon={Icon.ArrowClockwise} shortcut={shortcuts.refresh} onAction={() => run(refresh)} />
        <Action
          title="Extension Preferences"
          icon={Icon.Gear}
          shortcut={shortcuts.preferences}
          onAction={openExtensionPreferences}
        />
        <Action
          title="Restore Default Shortcuts"
          icon={Icon.RotateAntiClockwise}
          onAction={() => void restoreDefaultShortcuts()}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
  if (!collection && (view === "artists" || view === "albums")) {
    return (
      <Grid
        {...common}
        columns={4}
        searchBarAccessory={
          <Grid.Dropdown tooltip="Music View" value={view} onChange={changeView}>
            {views.map((v) => (
              <Grid.Dropdown.Item key={v.value} value={v.value} title={v.title} />
            ))}
          </Grid.Dropdown>
        }
      >
        <Grid.EmptyView
          title={error ?? "No Results"}
          description="Try another search or music view."
          actions={emptyActions}
        />
        {items
          .filter((item) => !collection || item.kind === "album")
          .map((item) => (
            <Grid.Item
              key={itemKey(item)}
              id={itemKey(item)}
              title={item.name}
              subtitle={subtitle(item)}
              content={thumbnail(item)}
              actions={actions(item)}
            />
          ))}
      </Grid>
    );
  }
  const sections =
    collection?.kind === "artist" ? (["album", "track"] as const) : (["player", "artist", "track", "album"] as const);
  return (
    <List
      {...common}
      isShowingDetail={view === "players"}
      searchBarAccessory={
        !collection ? (
          <List.Dropdown tooltip="Music View" value={view} onChange={changeView}>
            {views.map((v) => (
              <List.Dropdown.Item key={v.value} value={v.value} title={v.title} />
            ))}
          </List.Dropdown>
        ) : undefined
      }
    >
      <List.EmptyView
        title={error ?? "No Results"}
        description="Try another search or music view."
        actions={emptyActions}
      />
      {!collection && view === "players" ? (
        <PlayerSections query={query} actions={actions} />
      ) : (
        sections.map((kind) => (
          <List.Section
            key={kind}
            title={{ player: "Players", artist: "Artists", track: "Tracks", album: "Albums" }[kind]}
          >
            {items
              .filter(
                (item) =>
                  item.kind === kind &&
                  (!collection || item.kind === "track" || (collection.kind === "artist" && item.kind === "album")) &&
                  (item.kind !== "player" || item.available),
              )
              .map((item) => (
                <List.Item
                  key={itemKey(item)}
                  id={itemKey(item)}
                  title={item.name}
                  subtitle={subtitle(item)}
                  icon={thumbnail(item)}
                  accessories={
                    item.kind === "player"
                      ? [{ text: item.id === activeId ? "Active" : item.available ? "Enter to Select" : "Offline" }]
                      : []
                  }
                  detail={item.kind === "player" ? <PlayerDetail player={item} /> : undefined}
                  actions={actions(item)}
                />
              ))}
          </List.Section>
        ))
      )}
    </List>
  );
}
