import { Grid, Icon, List, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import type { Album, Artist, Item, Player, View } from "../domain/model";
import { itemKey } from "../domain/policy";
import { ItemActions } from "./item-actions";
import { reportError } from "./feedback";
import { SessionRoute, useMusic } from "./session";

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
function PlayerDetail({ player }: { player: Player }) {
  return (
    <List.Item.Detail
      markdown={`## ${player.name}\n\n${player.provider}\n\n${player.available ? "Available" : "Offline"}\n\nSelect with Enter. Volume shortcuts affect this highlighted player.\n\nGrouping and Sendspin management are planned for the live implementation.`}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Volume"
            text={player.volume === undefined ? "Unsupported" : `${player.volume}%`}
          />
          <List.Item.Detail.Metadata.Label title="State" text={player.state} />
          <List.Item.Detail.Metadata.Label title="Group Members" text={String(player.groupMemberIds.length)} />
          <List.Item.Detail.Metadata.Label title="Queue" text={player.queueId ?? "No Music Assistant queue"} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

export function MusicBrowser({ collection }: { collection?: Artist | Album }) {
  const { service, players, queues, activeId, revision, loading, busy } = useMusic();
  const { push } = useNavigation();
  const [view, setView] = useState<View>("all");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [searching, setSearching] = useState(true);
  const [error, setError] = useState<string>();
  useEffect(() => {
    const abort = new AbortController();
    setItems([]);
    setSearching(true);
    setError(undefined);
    const timer = setTimeout(
      () => {
        const request = collection
          ? service
              .browse(collection)
              .then((library) =>
                [...library.tracks, ...library.albums].filter((item) =>
                  `${item.name} ${item.artist}`.toLowerCase().includes(query.toLowerCase()),
                ),
              )
          : service.search({ view, query, limit: 100 }, abort.signal).then((page) => page.items);
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
    };
  }, [service, view, query, revision, collection]);
  const openCollection = (item: Artist | Album) =>
    push(
      <SessionRoute>
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
  };
  const actions = (item?: Item) => <ItemActions item={item} openCollection={openCollection} />;
  if (!collection && (view === "artists" || view === "albums")) {
    return (
      <Grid
        {...common}
        columns={4}
        actions={actions()}
        searchBarAccessory={
          <Grid.Dropdown tooltip="Music View" value={view} onChange={(value) => setView(value as View)}>
            {views.map((v) => (
              <Grid.Dropdown.Item key={v.value} value={v.value} title={v.title} />
            ))}
          </Grid.Dropdown>
        }
      >
        <Grid.EmptyView title={error ?? "No Results"} description="Try another search or music view." />
        {items.map((item) => (
          <Grid.Item
            key={itemKey(item)}
            title={item.name}
            subtitle={subtitle(item)}
            content={thumbnail(item)}
            actions={actions(item)}
          />
        ))}
      </Grid>
    );
  }
  const sections = ["player", "artist", "track", "album"] as const;
  return (
    <List
      {...common}
      isShowingDetail={view === "players"}
      actions={actions()}
      searchBarAccessory={
        !collection ? (
          <List.Dropdown tooltip="Music View" value={view} onChange={(value) => setView(value as View)}>
            {views.map((v) => (
              <List.Dropdown.Item key={v.value} value={v.value} title={v.title} />
            ))}
          </List.Dropdown>
        ) : undefined
      }
    >
      <List.EmptyView title={error ?? "No Results"} description="Try another search or music view." />
      {sections.map((kind) => (
        <List.Section
          key={kind}
          title={{ player: "Players", artist: "Artists", track: "Tracks", album: "Albums" }[kind]}
        >
          {items
            .filter((item) => item.kind === kind)
            .map((item) => (
              <List.Item
                key={itemKey(item)}
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
      ))}
    </List>
  );
}
