import { Action, ActionPanel, Alert, confirmAlert, Icon, List, showToast, Toast, Color } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { useState, useEffect } from "react";
import MusicAssistantClient from "./music-assistant-client";
import {
  Artist,
  Album,
  Track,
  Playlist,
  ItemMapping,
  QueueOption,
  RepeatMode,
  MediaItemType,
} from "./external-code/interfaces";
import { getSelectedQueueID } from "./use-selected-player-id";

type Tab = "search" | "browse" | "recent" | "queue";
type BrowseView = "artists" | "albums" | "playlists" | "artist-detail" | "album-detail" | "playlist-detail";

interface BreadcrumbState {
  view: BrowseView;
  artist?: Artist;
  album?: Album;
  playlist?: Playlist;
}

export default function MusicLibraryHubCommand() {
  const client = new MusicAssistantClient();
  const [activeTab, setActiveTab] = useState<Tab>("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [browseState, setBrowseState] = useCachedState<BreadcrumbState>("browse-state", { view: "artists" });

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <List
      navigationTitle="Music Library Hub"
      searchBarPlaceholder="Search your library..."
      searchText={activeTab === "search" ? searchQuery : ""}
      onSearchTextChange={activeTab === "search" ? setSearchQuery : () => {}}
      throttle
    >
      <List.Section title="Tabs">
        <List.Item
          title="Browse"
          icon={Icon.Folder}
          actions={
            <ActionPanel>
              <Action title="Switch to Browse" onAction={() => setActiveTab("browse")} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Recently Played"
          icon={Icon.Clock}
          actions={
            <ActionPanel>
              <Action title="Switch to Recently Played" onAction={() => setActiveTab("recent")} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Queue Manager"
          icon={Icon.List}
          actions={
            <ActionPanel>
              <Action title="Switch to Queue Manager" onAction={() => setActiveTab("queue")} />
            </ActionPanel>
          }
        />
      </List.Section>

      {activeTab === "search" && (
        <SearchTab client={client} searchQuery={debouncedSearchQuery} onTabChange={setActiveTab} />
      )}
      {activeTab === "browse" && (
        <BrowseTab client={client} browseState={browseState} setBrowseState={setBrowseState} />
      )}
      {activeTab === "recent" && <RecentlyPlayedTab client={client} />}
      {activeTab === "queue" && <QueueManagerTab client={client} />}
    </List>
  );
}

// Search Tab Component
function SearchTab({
  client,
  searchQuery,
  onTabChange,
}: {
  client: MusicAssistantClient;
  searchQuery: string;
  onTabChange: (tab: Tab) => void;
}) {
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
    const queueId = await getSelectedQueueID();
    if (!queueId) {
      return;
    }

    try {
      await client.playMedia(item, queueId, QueueOption.NEXT);
      await showToast({
        style: Toast.Style.Success,
        title: "Added to Queue",
        message: `"${itemName}" will play next`,
      });
      revalidate();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Add to Queue",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
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
                    title="Back to Tabs"
                    icon={Icon.ArrowLeft}
                    shortcut={{ modifiers: ["cmd"], key: "t" }}
                    onAction={() => onTabChange("search")}
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
                    title="Back to Tabs"
                    icon={Icon.ArrowLeft}
                    shortcut={{ modifiers: ["cmd"], key: "t" }}
                    onAction={() => onTabChange("search")}
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
                    title="Back to Tabs"
                    icon={Icon.ArrowLeft}
                    shortcut={{ modifiers: ["cmd"], key: "t" }}
                    onAction={() => onTabChange("search")}
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
                    title="Back to Tabs"
                    icon={Icon.ArrowLeft}
                    shortcut={{ modifiers: ["cmd"], key: "t" }}
                    onAction={() => onTabChange("search")}
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

// Browse Tab Component
function BrowseTab({
  client,
  browseState,
  setBrowseState,
}: {
  client: MusicAssistantClient;
  browseState: BreadcrumbState;
  setBrowseState: (state: BreadcrumbState) => void;
}) {
  const [page, setPage] = useState(0);
  const pageSize = 20;

  // Determine what to fetch based on browse state
  const { isLoading, data, revalidate } = useCachedPromise(
    async (state: BrowseView, artistId?: string, albumId?: string, playlistId?: string) => {
      const offset = page * pageSize;

      switch (state) {
        case "artists":
          return { type: "artists" as const, items: await client.getLibraryArtists(undefined, pageSize, offset) };
        case "albums":
          return { type: "albums" as const, items: await client.getLibraryAlbums(undefined, pageSize, offset) };
        case "playlists":
          return { type: "playlists" as const, items: await client.getLibraryPlaylists(undefined, pageSize, offset) };
        case "artist-detail":
          if (!artistId) throw new Error("Artist ID required");
          return { type: "albums" as const, items: await client.getArtistAlbums(artistId, "library") };
        case "album-detail":
          if (!albumId) throw new Error("Album ID required");
          return { type: "tracks" as const, items: await client.getAlbumTracks(albumId, "library") };
        case "playlist-detail":
          if (!playlistId) throw new Error("Playlist ID required");
          return { type: "tracks" as const, items: await client.getPlaylistTracks(playlistId, "library") };
        default:
          return { type: "artists" as const, items: [] };
      }
    },
    [browseState.view, browseState.artist?.item_id, browseState.album?.item_id, browseState.playlist?.item_id, page],
    {
      keepPreviousData: true,
    },
  );

  const addToQueue = async (item: MediaItemType, itemName: string) => {
    const queueId = await getSelectedQueueID();
    if (!queueId) {
      return;
    }

    try {
      await client.playMedia(item, queueId, QueueOption.NEXT);
      await showToast({
        style: Toast.Style.Success,
        title: "Added to Queue",
        message: `"${itemName}" will play next`,
      });
      revalidate();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Add to Queue",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const navigateBack = () => {
    setPage(0);
    if (browseState.view === "artist-detail") {
      setBrowseState({ view: "artists" });
    } else if (browseState.view === "album-detail") {
      if (browseState.artist) {
        setBrowseState({ view: "artist-detail", artist: browseState.artist });
      } else {
        setBrowseState({ view: "albums" });
      }
    } else if (browseState.view === "playlist-detail") {
      setBrowseState({ view: "playlists" });
    }
  };

  const getBreadcrumb = () => {
    const parts: string[] = [];
    if (browseState.artist) {
      parts.push(browseState.artist.name);
    }
    if (browseState.album) {
      parts.push(browseState.album.name);
    }
    if (browseState.playlist) {
      parts.push(browseState.playlist.name);
    }
    return parts.length > 0 ? parts.join(" > ") : undefined;
  };

  const breadcrumb = getBreadcrumb();

  return (
    <>
      <List.Section
        title={breadcrumb || "Browse"}
        subtitle={
          browseState.view === "artists"
            ? "Artists"
            : browseState.view === "albums"
              ? "Albums"
              : browseState.view === "playlists"
                ? "Playlists"
                : breadcrumb
        }
      >
        {(browseState.view === "artist-detail" ||
          browseState.view === "album-detail" ||
          browseState.view === "playlist-detail") && (
          <List.Item
            title="← Back"
            icon={Icon.ArrowLeft}
            actions={
              <ActionPanel>
                <Action title="Go Back" icon={Icon.ArrowLeft} onAction={navigateBack} />
              </ActionPanel>
            }
          />
        )}

        {browseState.view === "artists" && (
          <>
            <List.Item
              title="View Albums"
              icon={Icon.Music}
              actions={
                <ActionPanel>
                  <Action
                    title="View Albums"
                    icon={Icon.Music}
                    onAction={() => {
                      setPage(0);
                      setBrowseState({ view: "albums" });
                    }}
                  />
                </ActionPanel>
              }
            />
            <List.Item
              title="View Playlists"
              icon={Icon.Layers}
              actions={
                <ActionPanel>
                  <Action
                    title="View Playlists"
                    icon={Icon.Layers}
                    onAction={() => {
                      setPage(0);
                      setBrowseState({ view: "playlists" });
                    }}
                  />
                </ActionPanel>
              }
            />
          </>
        )}

        {browseState.view === "albums" && (
          <>
            <List.Item
              title="View Artists"
              icon={Icon.Person}
              actions={
                <ActionPanel>
                  <Action
                    title="View Artists"
                    icon={Icon.Person}
                    onAction={() => {
                      setPage(0);
                      setBrowseState({ view: "artists" });
                    }}
                  />
                </ActionPanel>
              }
            />
            <List.Item
              title="View Playlists"
              icon={Icon.Layers}
              actions={
                <ActionPanel>
                  <Action
                    title="View Playlists"
                    icon={Icon.Layers}
                    onAction={() => {
                      setPage(0);
                      setBrowseState({ view: "playlists" });
                    }}
                  />
                </ActionPanel>
              }
            />
          </>
        )}

        {browseState.view === "playlists" && (
          <>
            <List.Item
              title="View Artists"
              icon={Icon.Person}
              actions={
                <ActionPanel>
                  <Action
                    title="View Artists"
                    icon={Icon.Person}
                    onAction={() => {
                      setPage(0);
                      setBrowseState({ view: "artists" });
                    }}
                  />
                </ActionPanel>
              }
            />
            <List.Item
              title="View Albums"
              icon={Icon.Music}
              actions={
                <ActionPanel>
                  <Action
                    title="View Albums"
                    icon={Icon.Music}
                    onAction={() => {
                      setPage(0);
                      setBrowseState({ view: "albums" });
                    }}
                  />
                </ActionPanel>
              }
            />
          </>
        )}

        {isLoading && <List.Item title="Loading..." icon={Icon.Clock} />}

        {!isLoading && data?.items && data.items.length === 0 && (
          <List.Item title="No items found" icon={Icon.XMarkCircle} />
        )}

        {!isLoading &&
          data?.type === "artists" &&
          (data.items as Artist[]).map((artist) => (
            <List.Item
              key={artist.item_id}
              title={artist.name}
              subtitle={artist.metadata?.genres?.join(", ") || ""}
              icon={{ source: Icon.Person, tintColor: Color.Blue }}
              actions={
                <ActionPanel>
                  <Action
                    title="View Albums"
                    icon={Icon.ArrowRight}
                    onAction={() => {
                      setPage(0);
                      setBrowseState({ view: "artist-detail", artist });
                    }}
                  />
                  <Action title="Add to Queue" icon={Icon.Plus} onAction={() => addToQueue(artist, artist.name)} />
                </ActionPanel>
              }
            />
          ))}

        {!isLoading &&
          data?.type === "albums" &&
          (data.items as Album[]).map((album) => (
            <List.Item
              key={album.item_id}
              title={album.name}
              subtitle={album.version || ""}
              icon={{ source: Icon.Music, tintColor: Color.Green }}
              actions={
                <ActionPanel>
                  <Action
                    title="View Tracks"
                    icon={Icon.ArrowRight}
                    onAction={() => {
                      setPage(0);
                      setBrowseState({
                        view: "album-detail",
                        album,
                        artist: browseState.artist,
                      });
                    }}
                  />
                  <Action title="Add to Queue" icon={Icon.Plus} onAction={() => addToQueue(album, album.name)} />
                </ActionPanel>
              }
            />
          ))}

        {!isLoading &&
          data?.type === "playlists" &&
          (data.items as Playlist[]).map((playlist) => (
            <List.Item
              key={playlist.item_id}
              title={playlist.name}
              subtitle="Playlist"
              icon={{ source: Icon.Layers, tintColor: Color.Purple }}
              actions={
                <ActionPanel>
                  <Action
                    title="View Tracks"
                    icon={Icon.ArrowRight}
                    onAction={() => {
                      setPage(0);
                      setBrowseState({ view: "playlist-detail", playlist });
                    }}
                  />
                  <Action title="Add to Queue" icon={Icon.Plus} onAction={() => addToQueue(playlist, playlist.name)} />
                </ActionPanel>
              }
            />
          ))}

        {!isLoading &&
          data?.type === "tracks" &&
          (data.items as Track[]).map((track) => (
            <List.Item
              key={track.item_id}
              title={track.name}
              subtitle={track.version || ""}
              icon={{ source: Icon.Terminal, tintColor: Color.Orange }}
              actions={
                <ActionPanel>
                  <Action title="Add to Queue" icon={Icon.Plus} onAction={() => addToQueue(track, track.name)} />
                </ActionPanel>
              }
            />
          ))}

        {!isLoading && data?.items && data.items.length >= pageSize && (
          <List.Item
            title="Load More"
            icon={Icon.ArrowDown}
            actions={
              <ActionPanel>
                <Action title="Load More" icon={Icon.ArrowDown} onAction={() => setPage(page + 1)} />
              </ActionPanel>
            }
          />
        )}
      </List.Section>
    </>
  );
}

// Recently Played Tab Component
function RecentlyPlayedTab({ client }: { client: MusicAssistantClient }) {
  const {
    isLoading,
    data: recentItems,
    revalidate,
  } = useCachedPromise(async () => await client.getRecentlyPlayedItems(30), [], {
    keepPreviousData: true,
  });

  const addToQueue = async (item: ItemMapping, itemName: string) => {
    const queueId = await getSelectedQueueID();
    if (!queueId) {
      return;
    }

    try {
      await client.playMedia(item as unknown as MediaItemType, queueId, QueueOption.NEXT);
      await showToast({
        style: Toast.Style.Success,
        title: "Added to Queue",
        message: `"${itemName}" will play next`,
      });
      revalidate();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Add to Queue",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <List.Section title="Recently Played" subtitle={recentItems ? `${recentItems.length} item(s)` : undefined}>
      {isLoading && <List.Item title="Loading..." icon={Icon.Clock} />}

      {!isLoading && (!recentItems || recentItems.length === 0) && (
        <List.Item title="No recently played items" icon={Icon.XMarkCircle} />
      )}

      {!isLoading &&
        recentItems?.map((item, index) => {
          const getIcon = () => {
            if (item.uri.includes("artist")) return { source: Icon.Person, tintColor: Color.Blue };
            if (item.uri.includes("album")) return { source: Icon.Music, tintColor: Color.Green };
            if (item.uri.includes("playlist")) return { source: Icon.Layers, tintColor: Color.Purple };
            return { source: Icon.Terminal, tintColor: Color.Orange };
          };

          return (
            <List.Item
              key={`${item.item_id}-${index}`}
              title={item.name}
              subtitle={item.version || ""}
              icon={getIcon()}
              actions={
                <ActionPanel>
                  <Action title="Add to Queue" icon={Icon.Plus} onAction={() => addToQueue(item, item.name)} />
                </ActionPanel>
              }
            />
          );
        })}
    </List.Section>
  );
}

// Queue Manager Tab Component
function QueueManagerTab({ client }: { client: MusicAssistantClient }) {
  const { data: queueId } = useCachedPromise(async () => await getSelectedQueueID(), []);

  const {
    isLoading,
    data: queueData,
    revalidate,
  } = useCachedPromise(
    async (queueId: string | undefined) => {
      if (!queueId) return null;

      const [queue, items] = await Promise.all([
        client.getPlayerQueue(queueId),
        client.getPlayerQueueItems(queueId, 100, 0),
      ]);

      return { queue, items };
    },
    [queueId],
    {
      keepPreviousData: true,
      execute: !!queueId,
    },
  );

  const deleteItem = async (itemId: string, itemName: string) => {
    if (!queueId) return;

    try {
      await client.queueCommandDelete(queueId, itemId);
      await showToast({
        style: Toast.Style.Success,
        title: "Removed from Queue",
        message: `"${itemName}" removed`,
      });
      revalidate();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Remove Item",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const moveItem = async (itemId: string, direction: "up" | "down" | "next") => {
    if (!queueId) return;

    const posShift = direction === "up" ? -1 : direction === "down" ? 1 : 0;

    try {
      await client.queueCommandMoveItem(queueId, itemId, posShift);
      await showToast({
        style: Toast.Style.Success,
        title: "Item Moved",
        message: `Moved ${direction === "next" ? "to next" : direction}`,
      });
      revalidate();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Move Item",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const clearQueue = async () => {
    if (!queueId) return;

    const confirmed = await confirmAlert({
      title: "Clear Queue",
      message: "Are you sure you want to clear all items from the queue?",
      primaryAction: {
        title: "Clear Queue",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    try {
      await client.queueCommandClear(queueId);
      await showToast({
        style: Toast.Style.Success,
        title: "Queue Cleared",
        message: "All items removed from queue",
      });
      revalidate();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Clear Queue",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const toggleShuffle = async () => {
    if (!queueId || !queueData?.queue) return;

    try {
      await client.queueCommandShuffle(queueId, !queueData.queue.shuffle_enabled);
      await showToast({
        style: Toast.Style.Success,
        title: "Shuffle Toggled",
        message: queueData.queue.shuffle_enabled ? "Shuffle disabled" : "Shuffle enabled",
      });
      revalidate();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Toggle Shuffle",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const cycleRepeat = async () => {
    if (!queueId || !queueData?.queue) return;

    const nextMode =
      queueData.queue.repeat_mode === RepeatMode.OFF
        ? RepeatMode.ALL
        : queueData.queue.repeat_mode === RepeatMode.ALL
          ? RepeatMode.ONE
          : RepeatMode.OFF;

    try {
      await client.queueCommandRepeat(queueId, nextMode);
      await showToast({
        style: Toast.Style.Success,
        title: "Repeat Mode Changed",
        message: `Repeat: ${nextMode}`,
      });
      revalidate();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Change Repeat Mode",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  if (!queueId) {
    return (
      <List.Section title="Queue Manager">
        <List.Item
          title="No Active Player"
          subtitle="Please select an active player using 'Set Active Player' command"
          icon={Icon.XMarkCircle}
        />
      </List.Section>
    );
  }

  return (
    <List.Section
      title="Queue Manager"
      subtitle={
        queueData?.queue
          ? `${queueData.items?.length || 0} items | Shuffle: ${queueData.queue.shuffle_enabled ? "On" : "Off"} | Repeat: ${queueData.queue.repeat_mode}`
          : undefined
      }
    >
      {queueData?.queue && (
        <>
          <List.Item
            title="Queue Controls"
            icon={Icon.Gear}
            actions={
              <ActionPanel>
                <Action title="Toggle Shuffle" icon={Icon.Shuffle} onAction={toggleShuffle} />
                <Action title="Cycle Repeat Mode" icon={Icon.Repeat} onAction={cycleRepeat} />
                <Action title="Clear Queue" icon={Icon.Trash} style={Action.Style.Destructive} onAction={clearQueue} />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={revalidate}
                />
              </ActionPanel>
            }
          />
        </>
      )}

      {isLoading && <List.Item title="Loading queue..." icon={Icon.Clock} />}

      {!isLoading && (!queueData?.items || queueData.items.length === 0) && (
        <List.Item title="Queue is empty" icon={Icon.List} />
      )}

      {!isLoading &&
        queueData?.items?.map((item, index) => (
          <List.Item
            key={item.queue_item_id}
            title={`${index + 1}. ${item.name}`}
            subtitle={item.media_item ? "Available" : "Unavailable"}
            icon={item.available ? Icon.Dot : Icon.Circle}
            accessories={[
              {
                text: item.duration
                  ? `${Math.floor(item.duration / 60)}:${Math.floor(item.duration % 60)
                      .toString()
                      .padStart(2, "0")}`
                  : "",
              },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Move to Next"
                  icon={Icon.ArrowRight}
                  onAction={() => moveItem(item.queue_item_id, "next")}
                />
                <Action
                  title="Move up"
                  icon={Icon.ArrowUp}
                  shortcut={{ modifiers: ["cmd"], key: "arrowUp" }}
                  onAction={() => moveItem(item.queue_item_id, "up")}
                />
                <Action
                  title="Move Down"
                  icon={Icon.ArrowDown}
                  shortcut={{ modifiers: ["cmd"], key: "arrowDown" }}
                  onAction={() => moveItem(item.queue_item_id, "down")}
                />
                <Action
                  title="Remove from Queue"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                  onAction={() => deleteItem(item.queue_item_id, item.name)}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={revalidate}
                />
              </ActionPanel>
            }
          />
        ))}
    </List.Section>
  );
}
