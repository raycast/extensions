import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { MediaItemType } from "../music-assistant/external-code/interfaces";
import MusicAssistantClient from "../music-assistant/music-assistant-client";
import { commandOrControlShortcut } from "../shortcuts/shortcuts";
import { addItemToQueueNext } from "./actions";

interface SearchTabProps {
  client: MusicAssistantClient;
  searchQuery: string;
  onClearSearch: () => void;
}

export function SearchTab({ client, searchQuery, onClearSearch }: SearchTabProps) {
  const {
    isLoading,
    data: searchResults,
    revalidate,
  } = useCachedPromise(
    async (query: string) => {
      if (!query || query.trim().length === 0) {
        return null;
      }
      return await client.search(query, 50);
    },
    [searchQuery],
    {
      keepPreviousData: false,
      execute: searchQuery.trim().length > 0,
    },
  );

  const addToQueue = async (item: MediaItemType, itemName: string) => {
    await addItemToQueueNext(client, item, itemName, revalidate);
  };

  if (!searchQuery || searchQuery.trim().length === 0) {
    return (
      <List.Section title="Search">
        <List.Item
          title="Start typing to search..."
          subtitle="Search across artists, albums, tracks, and playlists"
          icon={Icon.MagnifyingGlass}
        />
      </List.Section>
    );
  }

  if (isLoading) {
    return (
      <List.Section title="Searching...">
        <List.Item title="Searching your library..." icon={Icon.MagnifyingGlass} />
      </List.Section>
    );
  }

  if (!searchResults) {
    return (
      <List.Section title="No Results">
        <List.Item title="No results found" subtitle="Try a different search query" icon={Icon.XMarkCircle} />
      </List.Section>
    );
  }

  const totalResults =
    (searchResults.artists?.length || 0) +
    (searchResults.albums?.length || 0) +
    (searchResults.tracks?.length || 0) +
    (searchResults.playlists?.length || 0);

  return (
    <>
      {searchResults.artists && searchResults.artists.length > 0 && (
        <List.Section title="Artists" subtitle={`${searchResults.artists.length} result(s)`}>
          {searchResults.artists.slice(0, 20).map((artist) => (
            <List.Item
              key={artist.item_id}
              title={artist.name}
              subtitle={artist.metadata?.genres?.join(", ") || "Artist"}
              icon={{ source: Icon.Person, tintColor: Color.Blue }}
              actions={
                <ActionPanel>
                  <Action title="Add to Queue" icon={Icon.Plus} onAction={() => addToQueue(artist, artist.name)} />
                  <Action
                    title="Clear Search"
                    icon={Icon.ArrowLeft}
                    shortcut={commandOrControlShortcut("t")}
                    onAction={onClearSearch}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {searchResults.albums && searchResults.albums.length > 0 && (
        <List.Section title="Albums" subtitle={`${searchResults.albums.length} result(s)`}>
          {searchResults.albums.slice(0, 20).map((album) => (
            <List.Item
              key={album.item_id}
              title={album.name}
              subtitle={album.version || "Album"}
              icon={{ source: Icon.Music, tintColor: Color.Green }}
              accessories={[{ text: album.metadata?.genres?.join(", ") || "" }]}
              actions={
                <ActionPanel>
                  <Action title="Add to Queue" icon={Icon.Plus} onAction={() => addToQueue(album, album.name)} />
                  <Action
                    title="Clear Search"
                    icon={Icon.ArrowLeft}
                    shortcut={commandOrControlShortcut("t")}
                    onAction={onClearSearch}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {searchResults.tracks && searchResults.tracks.length > 0 && (
        <List.Section title="Tracks" subtitle={`${searchResults.tracks.length} result(s)`}>
          {searchResults.tracks.slice(0, 20).map((track) => (
            <List.Item
              key={track.item_id}
              title={track.name}
              subtitle={track.version || "Track"}
              icon={{ source: Icon.Terminal, tintColor: Color.Orange }}
              accessories={[{ text: track.metadata?.performers?.join(", ") || "" }]}
              actions={
                <ActionPanel>
                  <Action title="Add to Queue" icon={Icon.Plus} onAction={() => addToQueue(track, track.name)} />
                  <Action
                    title="Clear Search"
                    icon={Icon.ArrowLeft}
                    shortcut={commandOrControlShortcut("t")}
                    onAction={onClearSearch}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {searchResults.playlists && searchResults.playlists.length > 0 && (
        <List.Section title="Playlists" subtitle={`${searchResults.playlists.length} result(s)`}>
          {searchResults.playlists.slice(0, 20).map((playlist) => (
            <List.Item
              key={playlist.item_id}
              title={playlist.name}
              subtitle="Playlist"
              icon={{ source: Icon.Layers, tintColor: Color.Purple }}
              actions={
                <ActionPanel>
                  <Action title="Add to Queue" icon={Icon.Plus} onAction={() => addToQueue(playlist, playlist.name)} />
                  <Action
                    title="Clear Search"
                    icon={Icon.ArrowLeft}
                    shortcut={commandOrControlShortcut("t")}
                    onAction={onClearSearch}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {totalResults === 0 && (
        <List.Section title="No Results">
          <List.Item
            title="No results found"
            subtitle={`No items found for "${searchQuery}"`}
            icon={Icon.XMarkCircle}
          />
        </List.Section>
      )}

      {(searchResults.artists && searchResults.artists.length > 20) ||
      (searchResults.albums && searchResults.albums.length > 20) ||
      (searchResults.tracks && searchResults.tracks.length > 20) ||
      (searchResults.playlists && searchResults.playlists.length > 20) ? (
        <List.Section title="Info">
          <List.Item
            title="Showing first 20 results per category"
            subtitle="Refine your search for more specific results"
            icon={Icon.Info}
          />
        </List.Section>
      ) : null}
    </>
  );
}
