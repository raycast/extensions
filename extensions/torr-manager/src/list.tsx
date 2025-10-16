import {
  ActionPanel,
  Action,
  Icon,
  List,
  showToast,
  Toast,
  getPreferenceValues,
  confirmAlert,
  Keyboard,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { useLocalStorage } from "@raycast/utils";
import { getAuthHeaders, handleDomain, timeoutFetch } from "./utils";
import { BasePreferences, TorrentItem } from "./models";

export default function Command() {
  const { torrserverUrl, mediaPlayerApp } = getPreferenceValues<BasePreferences>();

  const [items, setItems] = useState<TorrentItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { value: favorites = [], setValue: setFavorites } = useLocalStorage<string[]>("favorites", []);

  useEffect(() => {
    getList();
  }, [torrserverUrl]);

  const getList = async () => {
    setIsLoading(true);
    showToast(Toast.Style.Animated, "Processing...");

    try {
      const response = await timeoutFetch(`${handleDomain(torrserverUrl)}/torrents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          action: "list",
        }),
      });

      if (!response.ok) {
        showToast(Toast.Style.Failure, "Error", `Could not get playlist from ${torrserverUrl}`);
        return;
      }

      const torrents = (await response.json()) as TorrentItem[];
      showToast(Toast.Style.Success, "Success", `${torrents.length} results`);
      setItems(torrents);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      showToast(Toast.Style.Failure, "Error", `Could not connect to ${torrserverUrl}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async (itemTitle: string, hash: string) => {
    showToast(Toast.Style.Animated, "Processing...");

    const confirmation = await confirmAlert({
      title: "Confirm Removal",
      message: `Are you sure you want to remove the torrent "${itemTitle}"?`,
      icon: Icon.Trash,
      rememberUserChoice: true,
    });

    if (confirmation) {
      try {
        const response = await timeoutFetch(`${handleDomain(torrserverUrl)}/torrents`, {
          method: "POST",
          headers: {
            ...getAuthHeaders(),
          },
          body: JSON.stringify({
            action: "rem",
            hash,
          }),
        });

        if (!response.ok) {
          showToast(Toast.Style.Failure, "Error", "Failed to remove the torrent");
          return;
        }

        if (favorites.includes(hash)) {
          await removeFromFavorites(favorites, hash, false);
        }

        await getList();
        showToast(Toast.Style.Success, `Removed "${itemTitle}" successfully`);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        showToast(Toast.Style.Failure, "Error", "Failed to remove the torrent");
      }
    }
  };

  const removeFromFavorites = async (urls: string[], url: string, showAlert = false) => {
    const updatedFavorites = urls.filter((fav) => fav !== url);
    await setFavorites(updatedFavorites);

    if (showAlert) {
      showToast(Toast.Style.Success, "Removed from Favorites");
    }
  };

  const addToFavorites = async (urls: string[], url: string, showAlert = false) => {
    const updatedFavorites = [...urls, url];
    await setFavorites(updatedFavorites);

    if (showAlert) {
      showToast(Toast.Style.Success, "Added to Favorites");
    }
  };

  const toggleFavorite = async (url: string) => {
    const cleanedFavorites = favorites.filter((fav) => items.some((item) => item.hash === fav));

    if (favorites.includes(url)) {
      await removeFromFavorites(cleanedFavorites, url, true);
    } else {
      await addToFavorites(cleanedFavorites, url, true);
    }
  };

  const getStreamLink = (item: TorrentItem) => {
    const encodedTitle = encodeURIComponent(item.title);

    return `${handleDomain(torrserverUrl)}/stream/[${encodedTitle}] ${encodedTitle}.m3u?link=${item.hash}&m3u&fn=file.m3u`;
  };

  const sortedItems = [
    ...items.filter((item) => favorites.includes(item.hash)),
    ...items.filter((item) => !favorites.includes(item.hash)),
  ];

  return (
    <List isLoading={isLoading} throttle>
      {sortedItems.length === 0 ? (
        <List.EmptyView title="No torrents found" />
      ) : (
        sortedItems.map((item, index) => (
          <List.Item
            key={index}
            icon={Icon.Video}
            accessories={favorites.includes(item.hash) ? [{ icon: Icon.Star }] : []}
            title={item.title}
            actions={
              <ActionPanel>
                <Action.Open
                  title={`Open in ${mediaPlayerApp.name}`}
                  target={getStreamLink(item)}
                  icon={{ source: Icon.Video }}
                  application={mediaPlayerApp.path}
                />

                <Action
                  title={favorites.includes(item.hash) ? "Remove from Favorites" : "Add to Favorites"}
                  icon={favorites.includes(item.hash) ? Icon.Undo : Icon.Star}
                  shortcut={Keyboard.Shortcut.Common.Pin}
                  onAction={() => toggleFavorite(item.hash)}
                />
                <Action
                  title="Remove Torrent"
                  icon={Icon.Trash}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  style={Action.Style.Destructive}
                  onAction={() => handleRemove(item.title, item.hash)}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
