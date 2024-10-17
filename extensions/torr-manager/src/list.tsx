import { ActionPanel, Action, Icon, List, showToast, Toast, getPreferenceValues, confirmAlert } from "@raycast/api";
import { useEffect, useState } from "react";
import { useLocalStorage } from "@raycast/utils";
import fetch from "node-fetch";
import { getAuthHeaders, handleDomain } from "./utils";
import { Preferences, TorrentItem } from "./models";

export default function Command() {
  const { torrserverUrl, mediaPlayerApp } = getPreferenceValues<Preferences>();

  const [items, setItems] = useState<TorrentItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    value: favorites = [],
    setValue: setFavorites,
    isLoading: isLoadingFavorites,
  } = useLocalStorage<string[]>("favorites", []);

  useEffect(() => {
    getList();
  }, [torrserverUrl]);

  const getList = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(`${handleDomain(torrserverUrl)}/torrents`, {
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
        throw new Error("Failed to fetch updated playlist");
      }

      const torrents = (await response.json()) as TorrentItem[];
      setItems(torrents);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      showToast(Toast.Style.Failure, "Error", "Failed to update the torrent list");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRemove = async (itemTitle: string, hash: string) => {
    const confirmation = await confirmAlert({
      title: "Confirm Removal",
      message: `Are you sure you want to remove the torrent "${itemTitle}"?`,
      icon: Icon.Trash,
    });

    if (confirmation) {
      try {
        const response = await fetch(`${handleDomain(torrserverUrl)}/torrents`, {
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
          throw new Error("Failed to remove the torrent");
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
      showToast(Toast.Style.Success, "Removed from Favorites", url);
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

    return `${torrserverUrl}/stream/[${encodedTitle}] ${encodedTitle}.m3u?link=${item.hash}&m3u&fn=file.m3u`;
  };

  const sortedItems = [
    ...items.filter((item) => favorites.includes(item.hash)),
    ...items.filter((item) => !favorites.includes(item.hash)),
  ];

  return (
    <List isLoading={isRefreshing || isLoadingFavorites}>
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
                  onAction={() => toggleFavorite(item.hash)}
                />
                <Action title="Remove Torrent" icon={Icon.Trash} onAction={() => handleRemove(item.title, item.hash)} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
