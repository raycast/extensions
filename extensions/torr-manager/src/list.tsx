import { ActionPanel, Action, Icon, List, showToast, Toast, getPreferenceValues, confirmAlert } from "@raycast/api";
import { useEffect, useState } from "react";
import { useFetch, useLocalStorage } from "@raycast/utils";
import fetch from "node-fetch";
import { getAuthHeaders } from "./auth-headers";
import { Preferences } from "./models";

export default function Command() {
  const { torrserverUrl, mediaPlayerApp } = getPreferenceValues<Preferences>();

  const { isLoading, error } = useFetch(`${torrserverUrl}/playlistall/all.m3u`, {
    headers: {
      ...getAuthHeaders(),
    },
    keepPreviousData: true,
  });

  const [items, setItems] = useState<{ title: string; url: string }[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    value: favorites = [],
    setValue: setFavorites,
    isLoading: isLoadingFavorites,
  } = useLocalStorage<string[]>("favorites", []);

  const getList = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(`${torrserverUrl}/playlistall/all.m3u`, {
        headers: {
          ...getAuthHeaders(),
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch updated playlist");
      }

      const data = await response.text();
      const parsedItems = parseM3U(data);
      setItems(parsedItems);
    } catch (error) {
      showToast(Toast.Style.Failure, "Error", "Failed to update the torrent list");
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (error) {
      showToast(Toast.Style.Failure, "Failed to fetch playlist", error.message);
    } else {
      getList();
    }
  }, [error]);

  const parseM3U = (content: string): { title: string; url: string }[] => {
    const lines = content.split("\n");
    const parsedItems: { title: string; url: string }[] = [];
    let currentTitle = "";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith("#EXTINF")) {
        const titleMatch = line.match(/,(.+)/);
        currentTitle = titleMatch ? titleMatch[1] : "Unknown Title";
      } else if (line.startsWith("http") || line.startsWith("https")) {
        parsedItems.push({ title: currentTitle, url: line });
      }
    }

    return parsedItems;
  };

  const handleRemove = async (itemTitle: string, url: string) => {
    const confirmation = await confirmAlert({
      title: "Confirm Removal",
      message: `Are you sure you want to remove the torrent "${itemTitle}"?`,
      icon: Icon.Trash,
    });

    if (confirmation) {
      try {
        const urlObj = new URL(url);
        const hash = urlObj.searchParams.get("link");

        const response = await fetch(`${torrserverUrl}/torrents`, {
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

        if (favorites.includes(url)) {
          await removeFromFavorites(favorites, url, false);
        }

        await getList();
        showToast(Toast.Style.Success, `Removed "${itemTitle}" successfully`);
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
    const cleanedFavorites = favorites.filter((fav) => items.some((item) => item.url === fav));

    if (favorites.includes(url)) {
      await removeFromFavorites(cleanedFavorites, url, true);
    } else {
      await addToFavorites(cleanedFavorites, url, true);
    }
  };

  const sortedItems = [
    ...items.filter((item) => favorites.includes(item.url)),
    ...items.filter((item) => !favorites.includes(item.url)),
  ];

  return (
    <List isLoading={isLoading || isRefreshing || isLoadingFavorites}>
      {sortedItems.length === 0 && !isLoading ? (
        <List.EmptyView title="No torrents found" />
      ) : (
        sortedItems.map((item, index) => (
          <List.Item
            key={index}
            icon={Icon.Video}
            accessories={favorites.includes(item.url) ? [{ icon: Icon.Star }] : []}
            title={item.title}
            actions={
              <ActionPanel>
                <Action.Open
                  title={`Open in ${mediaPlayerApp}`}
                  target={`${mediaPlayerApp}://weblink?url=${encodeURIComponent(item.url)}`}
                />
                <Action
                  title={favorites.includes(item.url) ? "Remove from Favorites" : "Add to Favorites"}
                  icon={favorites.includes(item.url) ? Icon.Trash : Icon.Star}
                  onAction={() => toggleFavorite(item.url)}
                />
                <Action title="Remove Torrent" icon={Icon.Trash} onAction={() => handleRemove(item.title, item.url)} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
