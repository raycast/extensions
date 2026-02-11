import { ActionPanel, Action, List, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { VolumioAPI, BrowseItem, BrowseResponse } from "./volumio-api";

// URI patterns for navigation items
const NAVIGATION_URIS = ["playlists", "music-library", "artists://", "albums://", "genres://"];
const BROWSABLE_ROOT_URIS = [...NAVIGATION_URIS, "favourites"];

// Item types that can be played
const PLAYABLE_TYPES = ["song", "track", "playlist", "album", "radio", "webradio", "folder"];

// Item types that can be browsed
const BROWSABLE_TYPES = ["folder", "playlist-category", "artist", "album"];

export default function Browse() {
  const [items, setItems] = useState<BrowseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigationTitle = "Music Sources";
  const api = new VolumioAPI();
  const { push } = useNavigation();

  async function loadItems(uri?: string) {
    try {
      setIsLoading(true);
      const response = await api.browse(uri);
      const allItems: BrowseItem[] = [];

      // Handle different response structures from Volumio
      if (Array.isArray(response)) {
        // Sometimes the response is just an array
        allItems.push(...response);
      } else if (response && typeof response === "object") {
        // Response is BrowseResponse
        const browseResponse = response as BrowseResponse;
        if (browseResponse.navigation?.lists && Array.isArray(browseResponse.navigation.lists)) {
          // The lists array contains the items directly (based on the log output)
          allItems.push(...(browseResponse.navigation.lists as unknown as BrowseItem[]));
        } else if (browseResponse.navigation?.list && Array.isArray(browseResponse.navigation.list)) {
          // Sometimes Volumio returns 'list' instead of 'lists'
          allItems.push(...browseResponse.navigation.list);
        }
      }

      setItems(allItems);
      setIsLoading(false);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load items",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadItems();
  }, []);

  async function handlePlay(item: BrowseItem) {
    try {
      await api.clearQueue();
      await api.playPlaylist(item.uri);
      showToast({
        style: Toast.Style.Success,
        title: "Now playing",
        message: item.title || item.name || "Unknown",
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to play",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function handleAddToQueue(item: BrowseItem) {
    try {
      await api.addToQueue(item.uri);
      showToast({
        style: Toast.Style.Success,
        title: "Added to queue",
        message: item.title || item.name || "Unknown",
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to add to queue",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function handleBrowse(item: BrowseItem) {
    push(<BrowseView uri={item.uri} title={item.title || item.name || "Unknown"} />);
  }

  function getIcon(item: BrowseItem) {
    switch (item.type) {
      case "folder":
      case "playlist-category":
        return Icon.Folder;
      case "playlist":
        return Icon.List;
      case "album":
        return Icon.Cd;
      case "song":
      case "track":
        return Icon.Music;
      case "artist":
        return Icon.Person;
      case "radio":
      case "webradio":
        return Icon.Livestream;
      default:
        return Icon.Document;
    }
  }

  function isPlayable(item: BrowseItem) {
    // Items that can be played
    if (item.type) {
      return PLAYABLE_TYPES.includes(item.type);
    }
    // For items without type, check if they're NOT just navigation items
    return !NAVIGATION_URIS.includes(item.uri);
  }

  function isBrowsable(item: BrowseItem) {
    // For root level items, check the uri pattern
    if (!item.type) {
      return BROWSABLE_ROOT_URIS.includes(item.uri);
    }
    // These types can be browsed deeper
    return BROWSABLE_TYPES.includes(item.type);
  }

  return (
    <List isLoading={isLoading} navigationTitle={navigationTitle}>
      {items.map((item, index) => (
        <List.Item
          key={`${item.uri}-${index}`}
          title={item.title || item.name || "Unknown"}
          subtitle={item.artist || item.album}
          icon={item.albumart ? api.getAlbumArtUrl(item.albumart) : getIcon(item)}
          actions={
            <ActionPanel>
              {isBrowsable(item) && <Action title="Browse" icon={Icon.Folder} onAction={() => handleBrowse(item)} />}
              {isPlayable(item) && (
                <>
                  <Action title="Play Now" icon={Icon.Play} onAction={() => handlePlay(item)} />
                  <Action title="Add to Queue" icon={Icon.Plus} onAction={() => handleAddToQueue(item)} />
                </>
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function BrowseView({ uri, title }: { uri: string; title: string }) {
  const [items, setItems] = useState<BrowseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const api = new VolumioAPI();
  const { push } = useNavigation();

  async function loadItems() {
    try {
      setIsLoading(true);
      const response = await api.browse(uri);
      const allItems: BrowseItem[] = [];

      // Handle different response structures from Volumio
      if (Array.isArray(response)) {
        // Sometimes the response is just an array
        allItems.push(...response);
      } else if (response && typeof response === "object") {
        // Response is BrowseResponse
        const browseResponse = response as BrowseResponse;
        if (browseResponse.navigation?.lists && Array.isArray(browseResponse.navigation.lists)) {
          // Check if lists contain items with an items property (nested structure)
          const firstList = browseResponse.navigation.lists[0];
          if (firstList && "items" in firstList && Array.isArray((firstList as Record<string, unknown>).items)) {
            // Nested structure
            browseResponse.navigation.lists.forEach((list: Record<string, unknown>) => {
              if (list?.items && Array.isArray(list.items)) {
                allItems.push(...(list.items as BrowseItem[]));
              }
            });
          } else {
            // Flat structure - the lists array contains the items directly
            allItems.push(...(browseResponse.navigation.lists as unknown as BrowseItem[]));
          }
        } else if (browseResponse.navigation?.list && Array.isArray(browseResponse.navigation.list)) {
          // Sometimes Volumio returns 'list' instead of 'lists'
          allItems.push(...browseResponse.navigation.list);
        }
      }

      setItems(allItems);
      setIsLoading(false);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load items",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadItems();
  }, [uri]);

  async function handlePlay(item: BrowseItem) {
    try {
      await api.clearQueue();
      await api.playPlaylist(item.uri);

      if (item.type === "playlist" || item.type === "album") {
        await api.toggleRandom();
        showToast({
          style: Toast.Style.Success,
          title: "Now playing with shuffle",
          message: item.title || item.name || "Unknown",
        });
      } else {
        showToast({
          style: Toast.Style.Success,
          title: "Now playing",
          message: item.title || item.name || "Unknown",
        });
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to play",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function handlePlayWithShuffle(item: BrowseItem) {
    try {
      await api.clearQueue();
      await api.playPlaylist(item.uri);
      await api.toggleRandom();
      showToast({
        style: Toast.Style.Success,
        title: "Now playing with shuffle",
        message: item.title || item.name || "Unknown",
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to play",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function handleAddToQueue(item: BrowseItem) {
    try {
      await api.addToQueue(item.uri);
      showToast({
        style: Toast.Style.Success,
        title: "Added to queue",
        message: item.title || item.name || "Unknown",
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to add to queue",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function handleBrowse(item: BrowseItem) {
    push(<BrowseView uri={item.uri} title={item.title || item.name || "Unknown"} />);
  }

  function getIcon(item: BrowseItem) {
    switch (item.type) {
      case "folder":
      case "playlist-category":
        return Icon.Folder;
      case "playlist":
        return Icon.List;
      case "album":
        return Icon.Cd;
      case "song":
      case "track":
        return Icon.Music;
      case "artist":
        return Icon.Person;
      case "radio":
      case "webradio":
        return Icon.Livestream;
      default:
        return Icon.Document;
    }
  }

  function isPlayable(item: BrowseItem) {
    // Items that can be played
    if (item.type) {
      return PLAYABLE_TYPES.includes(item.type);
    }
    // For items without type, check if they're NOT just navigation items
    return !NAVIGATION_URIS.includes(item.uri);
  }

  function isBrowsable(item: BrowseItem) {
    // For root level items, check the uri pattern
    if (!item.type) {
      return BROWSABLE_ROOT_URIS.includes(item.uri);
    }
    // These types can be browsed deeper
    return BROWSABLE_TYPES.includes(item.type);
  }

  function isShuffleable(item: BrowseItem) {
    return ["playlist", "album"].includes(item.type || "");
  }

  return (
    <List isLoading={isLoading} navigationTitle={title}>
      {items.map((item, index) => (
        <List.Item
          key={`${item.uri}-${index}`}
          title={item.title || item.name || "Unknown"}
          subtitle={item.artist || item.album}
          icon={item.albumart ? api.getAlbumArtUrl(item.albumart) : getIcon(item)}
          actions={
            <ActionPanel>
              {isBrowsable(item) && <Action title="Browse" icon={Icon.Folder} onAction={() => handleBrowse(item)} />}
              {isPlayable(item) && (
                <>
                  <Action title="Play Now" icon={Icon.Play} onAction={() => handlePlay(item)} />
                  {isShuffleable(item) && (
                    <Action
                      title="Play with Shuffle"
                      icon={Icon.Shuffle}
                      onAction={() => handlePlayWithShuffle(item)}
                    />
                  )}
                  <Action title="Add to Queue" icon={Icon.Plus} onAction={() => handleAddToQueue(item)} />
                </>
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
