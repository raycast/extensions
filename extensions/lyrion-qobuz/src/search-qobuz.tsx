import {
  ActionPanel,
  Action,
  Clipboard,
  Color,
  Icon,
  Image,
  Keyboard,
  List,
  Toast,
  getPreferenceValues,
  showToast,
  useNavigation,
} from "@raycast/api";
import { usePromise, useLocalStorage } from "@raycast/utils";
import { useRef, useState, useCallback } from "react";
import { LyrionClient, type PlaybackMode, type SearchItem } from "./lms";

const RECENT_SEARCHES_KEY = "recent-searches";
const MAX_RECENT_SEARCHES = 8;

function getClient(): LyrionClient {
  const prefs = getPreferenceValues<Preferences>();
  return new LyrionClient(
    prefs.lmsHost,
    prefs.lmsPort ?? "9000",
    prefs.playerId,
  );
}

const PLAYBACK_LABELS: Record<
  PlaybackMode,
  { title: string; pastTense: string; icon: Icon }
> = {
  play: { title: "Play Now", pastTense: "Playing", icon: Icon.Play },
  insert: { title: "Play Next", pastTense: "Queued next", icon: Icon.Forward },
  add: {
    title: "Add to Queue",
    pastTense: "Added to queue",
    icon: Icon.PlusCircle,
  },
};

const PLAYBACK_SHORTCUTS: Record<PlaybackMode, Keyboard.Shortcut> = {
  play: { modifiers: [], key: "return" },
  insert: { modifiers: ["shift"], key: "return" },
  add: { modifiers: ["cmd", "shift"], key: "return" },
};

function typeLabel(type: string): string {
  switch (type) {
    case "playlist":
      return "Album";
    case "audio":
      return "Track";
    default:
      return type ? type.charAt(0).toUpperCase() + type.slice(1) : "";
  }
}

function typeColor(type: string): Color {
  switch (type) {
    case "playlist":
      return Color.Purple;
    case "audio":
      return Color.Blue;
    default:
      return Color.SecondaryText;
  }
}

const PLACEHOLDER_PATTERNS = [
  "/html/images/",
  "nocover",
  "nogenre",
  "noplaylist",
  "noradio",
  "nowork",
];

function isPlaceholder(url: string): boolean {
  const lower = url.toLowerCase();
  return PLACEHOLDER_PATTERNS.some((p) => lower.includes(p));
}

function getCategoryIcon(name: string): Image.ImageLike {
  const lower = name.toLowerCase();
  if (lower.includes("release") || lower.includes("album"))
    return { source: "album.svg", tintColor: Color.SecondaryText };
  if (lower.includes("artist"))
    return { source: "artist.svg", tintColor: Color.SecondaryText };
  if (lower.includes("song") || lower.includes("track"))
    return { source: "track.svg", tintColor: Color.SecondaryText };
  if (lower.includes("playlist"))
    return { source: "playlist.svg", tintColor: Color.SecondaryText };
  return { source: "folder-music.svg", tintColor: Color.SecondaryText };
}

function getFallbackIcon(item: SearchItem): Image.ImageLike {
  if (item.playId) {
    const src = item.type === "audio" ? "track.svg" : "album.svg";
    return { source: src, tintColor: Color.SecondaryText };
  }
  const lower = (item.title || item.name).toLowerCase();
  if (
    lower.includes("album") ||
    lower.includes("release") ||
    lower.includes("single")
  )
    return { source: "album.svg", tintColor: Color.SecondaryText };
  if (lower.includes("song") || lower.includes("track"))
    return { source: "track.svg", tintColor: Color.SecondaryText };
  if (lower.includes("playlist"))
    return { source: "playlist.svg", tintColor: Color.SecondaryText };
  return { source: "artist.svg", tintColor: Color.SecondaryText };
}

function getItemIcon(item: SearchItem, client: LyrionClient): Image.ImageLike {
  const artworkUrl = client.getArtworkUrl(item.icon, 100);
  const isArtist = item.type === "artist" || item.goId?.includes("artist");
  const mask = isArtist ? Image.Mask.Circle : Image.Mask.RoundedRectangle;

  if (artworkUrl && !isPlaceholder(artworkUrl)) {
    return { source: artworkUrl, fallback: "album.svg", mask };
  }

  const fallback = getFallbackIcon(item);
  if (typeof fallback === "object" && "source" in fallback) {
    return { ...fallback, mask };
  }
  return fallback;
}

function buildCopyText(item: SearchItem): string {
  const title = item.title || item.name;
  if (item.artist && item.album && item.type === "audio") {
    return `${item.artist} – ${title} (${item.album})`;
  }
  if (item.artist) {
    return `${item.artist} – ${title}`;
  }
  return title;
}

function PlaybackActions({
  item,
  query,
  client,
}: {
  item: SearchItem;
  query: string;
  client: LyrionClient;
}) {
  async function handlePlayback(mode: PlaybackMode) {
    const label = PLAYBACK_LABELS[mode];
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `${label.title}...`,
    });
    const result = await client.play(item.playId, query, mode);
    if (result.success) {
      toast.style = Toast.Style.Success;
      toast.title = label.pastTense;
      toast.message = item.name;
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = `${label.title} failed`;
      toast.message = result.error;
    }
  }

  const copyText = buildCopyText(item);

  return (
    <>
      {(["play", "insert", "add"] as PlaybackMode[]).map((mode) => {
        const label = PLAYBACK_LABELS[mode];
        return (
          <Action
            key={mode}
            title={label.title}
            icon={label.icon}
            shortcut={mode !== "play" ? PLAYBACK_SHORTCUTS[mode] : undefined}
            onAction={() => handlePlayback(mode)}
          />
        );
      })}
      <Action.CopyToClipboard
        title="Copy Title"
        content={copyText}
        shortcut={{ modifiers: ["cmd"], key: "c" }}
        onCopy={() => Clipboard.copy(copyText)}
      />
    </>
  );
}

function ItemDetail({
  item,
  client,
}: {
  item: SearchItem;
  client: LyrionClient;
}) {
  const artworkUrl = client.getArtworkUrl(item.icon, 600);
  const hasRealArtwork = artworkUrl && !isPlaceholder(artworkUrl);

  const markdown = hasRealArtwork
    ? `![Artwork](${artworkUrl})`
    : `## ${item.title || item.name}\n\n${item.artist || ""}`;

  const label = typeLabel(item.type);

  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Title"
            text={item.title || item.name}
          />
          {item.artist && (
            <List.Item.Detail.Metadata.Label
              title="Artist"
              text={item.artist}
            />
          )}
          {item.album && (
            <List.Item.Detail.Metadata.Label title="Album" text={item.album} />
          )}

          <List.Item.Detail.Metadata.Separator />

          {item.quality && (
            <List.Item.Detail.Metadata.Label
              title="Quality"
              icon={{ source: Icon.Star, tintColor: Color.Green }}
              text={{ value: item.quality, color: Color.Green }}
            />
          )}

          {label && (
            <List.Item.Detail.Metadata.Label
              title="Type"
              text={{ value: label, color: typeColor(item.type) }}
            />
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function SubMenuView({
  query,
  goId,
  title,
}: {
  query: string;
  goId: string;
  title: string;
}) {
  const clientRef = useRef(getClient());
  const client = clientRef.current;
  const { push } = useNavigation();

  const { isLoading, data: items } = usePromise(
    async (q: string, id: string) => client.getSubmenu(q, id),
    [query, goId],
    {
      onError: (error) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load items",
          message: error instanceof Error ? error.message : String(error),
        });
      },
    },
  );

  const hasPlayableItems = items?.some((i) => i.playId) ?? false;

  // Check if all items share the same artist
  const commonArtist = items?.length
    ? items.reduce(
        (acc, item) => {
          if (acc === null) return item.artist;
          return acc === item.artist ? acc : undefined;
        },
        null as string | undefined | null,
      )
    : undefined;

  const baseTitle =
    commonArtist && !title.includes(commonArtist)
      ? `${title} - ${commonArtist}`
      : title;

  const displayTitle = items?.length
    ? `${baseTitle} (${items.length})`
    : baseTitle;

  return (
    <List
      isLoading={isLoading}
      navigationTitle={displayTitle}
      isShowingDetail={hasPlayableItems}
    >
      {!items || items.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No items found"
          description="This section appears to be empty"
        />
      ) : (
        items.map((item, index) => {
          const qualitySuffix = item.quality ? ` (${item.quality})` : "";

          // Construct subtitle: "Artist" or "Artist • Album"
          // If commonArtist is detected, omit it from the subtitle to save space
          let subtitle = item.artist === commonArtist ? undefined : item.artist;

          if (item.album) {
            subtitle = subtitle ? `${subtitle} • ${item.album}` : item.album;
          }

          // Build accessories
          const accessories: List.Item.Accessory[] = [];

          if (!hasPlayableItems) {
            // For browseable lists (like artist list), show artist name if not in title
            if (item.artist && item.artist !== item.title) {
              accessories.push({ text: item.artist });
            }
          }

          if (item.quality) {
            accessories.push({
              tag: { value: item.quality, color: Color.Green },
              tooltip: "Quality",
            });
          }

          if (item.type) {
            const typeName = typeLabel(item.type);
            if (typeName) {
              accessories.push({
                tag: { value: typeName, color: typeColor(item.type) },
                tooltip: "Type",
              });
            }
          }

          return (
            <List.Item
              key={`${item.goId || item.playId}-${index}`}
              title={item.title || item.name}
              subtitle={hasPlayableItems ? subtitle : undefined}
              accessories={hasPlayableItems ? undefined : accessories}
              keywords={[item.artist, item.album, item.quality].filter(Boolean)}
              icon={getItemIcon(item, client)}
              detail={
                hasPlayableItems ? (
                  <ItemDetail item={item} client={client} />
                ) : undefined
              }
              actions={
                <ActionPanel
                  title={`${item.title || item.name}${qualitySuffix}`}
                >
                  {item.playId ? (
                    <PlaybackActions
                      item={item}
                      query={query}
                      client={client}
                    />
                  ) : (
                    <>
                      <Action
                        title="Browse"
                        icon={Icon.ArrowRight}
                        onAction={() =>
                          push(
                            <SubMenuView
                              query={query}
                              goId={item.goId}
                              title={item.title || item.name}
                            />,
                          )
                        }
                      />
                      <Action.CopyToClipboard
                        title="Copy Name"
                        content={buildCopyText(item)}
                        shortcut={{ modifiers: ["cmd"], key: "c" }}
                      />
                    </>
                  )}
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}

export default function SearchQobuz() {
  const [searchText, setSearchText] = useState("");
  const clientRef = useRef(getClient());
  const client = clientRef.current;
  const { push } = useNavigation();

  const { value: recentSearches = [], setValue: setRecentSearches } =
    useLocalStorage<string[]>(RECENT_SEARCHES_KEY, []);

  const saveSearch = useCallback(
    (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) return;
      const updated = [
        trimmed,
        ...(recentSearches ?? []).filter((s) => s !== trimmed),
      ].slice(0, MAX_RECENT_SEARCHES);
      setRecentSearches(updated);
    },
    [recentSearches, setRecentSearches],
  );

  const removeRecentSearch = useCallback(
    (query: string) => {
      setRecentSearches((recentSearches ?? []).filter((s) => s !== query));
    },
    [recentSearches, setRecentSearches],
  );

  const { isLoading, data: categories } = usePromise(
    async (q: string) => {
      if (!q.trim()) return [];
      return client.searchQobuz(q);
    },
    [searchText],
    {
      execute: searchText.trim().length > 0,
      onError: (error) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Search failed",
          message: error instanceof Error ? error.message : String(error),
        });
      },
    },
  );

  const isEmptySearch = !searchText.trim();
  const hasResults = categories && categories.length > 0;

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Qobuz..."
      throttle
    >
      {isEmptySearch ? (
        recentSearches && recentSearches.length > 0 ? (
          <List.Section title="Recent Searches">
            {recentSearches.map((query) => (
              <List.Item
                key={query}
                title={query}
                icon={Icon.Clock}
                actions={
                  <ActionPanel>
                    <Action
                      title="Search Again"
                      icon={Icon.MagnifyingGlass}
                      onAction={() => {
                        saveSearch(query);
                        push(
                          <SearchResultsView
                            query={query}
                            client={client}
                            onSearch={saveSearch}
                          />,
                        );
                      }}
                    />
                    <Action
                      title="Remove from Recents"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["ctrl"], key: "x" }}
                      onAction={() => removeRecentSearch(query)}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ) : (
          <List.EmptyView
            icon={{ source: "headphones.svg", tintColor: Color.SecondaryText }}
            title="Search Qobuz"
            description="Find albums, artists, tracks and playlists"
          />
        )
      ) : !hasResults ? (
        isLoading ? null : (
          <List.EmptyView
            icon={Icon.MagnifyingGlass}
            title="No results found"
            description={`Nothing found for "${searchText}"`}
          />
        )
      ) : (
        <List.Section title={`Results for "${searchText}"`}>
          {categories.map((cat, index) => (
            <List.Item
              key={`${cat.goId}-${index}`}
              title={cat.name}
              icon={getCategoryIcon(cat.name)}
              actions={
                <ActionPanel>
                  <Action
                    title="Browse"
                    icon={Icon.ArrowRight}
                    onAction={() => {
                      saveSearch(searchText);
                      push(
                        <SubMenuView
                          query={searchText}
                          goId={cat.goId}
                          title={cat.name}
                        />,
                      );
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function SearchResultsView({
  query,
  client,
  onSearch,
}: {
  query: string;
  client: LyrionClient;
  onSearch: (q: string) => void;
}) {
  const { push } = useNavigation();

  const { isLoading, data: categories } = usePromise(
    async (q: string) => client.searchQobuz(q),
    [query],
    {
      onError: (error) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Search failed",
          message: error instanceof Error ? error.message : String(error),
        });
      },
    },
  );

  return (
    <List isLoading={isLoading} navigationTitle={query}>
      {!categories || categories.length === 0 ? (
        isLoading ? null : (
          <List.EmptyView
            icon={Icon.MagnifyingGlass}
            title="No results found"
            description={`Nothing found for "${query}"`}
          />
        )
      ) : (
        categories.map((cat, index) => (
          <List.Item
            key={`${cat.goId}-${index}`}
            title={cat.name}
            icon={getCategoryIcon(cat.name)}
            actions={
              <ActionPanel>
                <Action
                  title="Browse"
                  icon={Icon.ArrowRight}
                  onAction={() => {
                    onSearch(query);
                    push(
                      <SubMenuView
                        query={query}
                        goId={cat.goId}
                        title={cat.name}
                      />,
                    );
                  }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
