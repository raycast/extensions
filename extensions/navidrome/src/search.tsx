import {
  ActionPanel,
  Action,
  List,
  Icon,
  Image,
  Color,
  LocalStorage,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  search3,
  getCoverArtUrl,
  getNavidromeWebUrl,
  formatDuration,
  type Artist,
  type Album,
  type Song,
} from "./api";

const RECENT_SEARCHES_KEY = "recent-searches";
const MAX_RECENT_SEARCHES = 10;

async function loadRecentSearches(): Promise<string[]> {
  const raw = await LocalStorage.getItem<string>(RECENT_SEARCHES_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function saveRecentSearches(searches: string[]): Promise<void> {
  await LocalStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches));
}

export default function SearchCommand() {
  const [query, setQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const searchTextRef = useRef(setQuery);

  useEffect(() => {
    loadRecentSearches().then(setRecentSearches);
  }, []);

  const addRecentSearch = useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      if (!trimmed) return;
      const updated = [
        trimmed,
        ...recentSearches.filter((s) => s !== trimmed),
      ].slice(0, MAX_RECENT_SEARCHES);
      setRecentSearches(updated);
      await saveRecentSearches(updated);
    },
    [recentSearches],
  );

  const removeRecentSearch = useCallback(
    async (q: string) => {
      const updated = recentSearches.filter((s) => s !== q);
      setRecentSearches(updated);
      await saveRecentSearches(updated);
    },
    [recentSearches],
  );

  const clearRecentSearches = useCallback(async () => {
    setRecentSearches([]);
    await LocalStorage.removeItem(RECENT_SEARCHES_KEY);
  }, []);

  const { data, isLoading } = useCachedPromise(
    async (q: string) => {
      if (!q.trim()) return null;
      return await search3(q);
    },
    [query],
    {
      keepPreviousData: true,
      onError: (err) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Search failed",
          message: err.message,
        });
      },
    },
  );

  const hasResults =
    data &&
    (data.artists.length > 0 ||
      data.albums.length > 0 ||
      data.songs.length > 0);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search artists, albums, and songs..."
      onSearchTextChange={(text) => {
        setQuery(text);
        searchTextRef.current = setQuery;
      }}
      throttle
    >
      {!query.trim() ? (
        recentSearches.length > 0 ? (
          <List.Section
            title="Recent Searches"
            subtitle={`${recentSearches.length}`}
          >
            {recentSearches.map((recent) => (
              <List.Item
                key={recent}
                icon={Icon.Clock}
                title={recent}
                actions={
                  <ActionPanel>
                    <Action
                      title="Search Again"
                      icon={Icon.MagnifyingGlass}
                      onAction={() => setQuery(recent)}
                    />
                    <Action
                      title="Remove from Recent Searches"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["ctrl"], key: "x" }}
                      onAction={() => removeRecentSearch(recent)}
                    />
                    <Action
                      title="Clear All Recent Searches"
                      icon={Icon.XMarkCircle}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
                      onAction={clearRecentSearches}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ) : (
          <List.EmptyView
            icon={Icon.MagnifyingGlass}
            title="Search Your Library"
            description="Type to search for artists, albums, and songs"
          />
        )
      ) : !hasResults && !isLoading ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Results"
          description={`No results found for "${query}"`}
        />
      ) : null}

      {data && data.artists.length > 0 && (
        <List.Section title="Artists" subtitle={`${data.artists.length}`}>
          {data.artists.map((artist) => (
            <ArtistItem
              key={artist.id}
              artist={artist}
              onAction={() => addRecentSearch(query)}
            />
          ))}
        </List.Section>
      )}

      {data && data.albums.length > 0 && (
        <List.Section title="Albums" subtitle={`${data.albums.length}`}>
          {data.albums.map((album) => (
            <AlbumItem
              key={album.id}
              album={album}
              onAction={() => addRecentSearch(query)}
            />
          ))}
        </List.Section>
      )}

      {data && data.songs.length > 0 && (
        <List.Section title="Songs" subtitle={`${data.songs.length}`}>
          {data.songs.map((song) => (
            <SongItem
              key={song.id}
              song={song}
              onAction={() => addRecentSearch(query)}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function ArtistItem({
  artist,
  onAction,
}: {
  artist: Artist;
  onAction: () => void;
}) {
  const url = getNavidromeWebUrl("artist", artist.id);
  const subtitle = artist.albumCount
    ? `${artist.albumCount} album${artist.albumCount !== 1 ? "s" : ""}`
    : "";

  return (
    <List.Item
      icon={
        artist.coverArt
          ? {
              source: getCoverArtUrl(artist.coverArt),
              mask: Image.Mask.RoundedRectangle,
            }
          : Icon.PersonCircle
      }
      title={artist.name}
      subtitle={subtitle}
      accessories={[
        ...(artist.starred
          ? [{ icon: { source: Icon.Star, tintColor: Color.Yellow } }]
          : []),
        { tag: { value: "Artist", color: Color.Purple } },
      ]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in Navidrome"
            url={url}
            onOpen={onAction}
          />
          <Action.CopyToClipboard
            title="Copy Artist Name"
            content={artist.name}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy URL"
            content={url}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}

function AlbumItem({
  album,
  onAction,
}: {
  album: Album;
  onAction: () => void;
}) {
  const url = getNavidromeWebUrl("album", album.id);
  const details: string[] = [];
  if (album.artist) details.push(album.artist);
  if (album.year) details.push(String(album.year));

  return (
    <List.Item
      icon={
        album.coverArt
          ? {
              source: getCoverArtUrl(album.coverArt),
              mask: Image.Mask.RoundedRectangle,
            }
          : Icon.Music
      }
      title={album.name}
      subtitle={details.join(" · ")}
      accessories={[
        ...(album.starred
          ? [{ icon: { source: Icon.Star, tintColor: Color.Yellow } }]
          : []),
        ...(album.songCount ? [{ text: `${album.songCount} tracks` }] : []),
        { tag: { value: "Album", color: Color.Blue } },
      ]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in Navidrome"
            url={url}
            onOpen={onAction}
          />
          <Action.CopyToClipboard
            title="Copy Album Name"
            content={album.name}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy URL"
            content={url}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}

function SongItem({ song, onAction }: { song: Song; onAction: () => void }) {
  const url = song.albumId
    ? getNavidromeWebUrl("album", song.albumId)
    : getNavidromeWebUrl("song", song.id);
  const details: string[] = [];
  if (song.artist) details.push(song.artist);
  if (song.album) details.push(song.album);

  return (
    <List.Item
      icon={
        song.coverArt
          ? {
              source: getCoverArtUrl(song.coverArt),
              mask: Image.Mask.RoundedRectangle,
            }
          : Icon.Music
      }
      title={song.title}
      subtitle={details.join(" · ")}
      accessories={[
        ...(song.starred
          ? [{ icon: { source: Icon.Star, tintColor: Color.Yellow } }]
          : []),
        ...(song.duration ? [{ text: formatDuration(song.duration) }] : []),
        { tag: { value: "Song", color: Color.Green } },
      ]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open Album in Navidrome"
            url={url}
            onOpen={onAction}
          />
          <Action.CopyToClipboard
            title="Copy Song Title"
            content={song.title}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy URL"
            content={url}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
