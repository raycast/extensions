import { ActionPanel, Action, Icon, List, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import fetch from "node-fetch";
import { getAuthHeaders } from "./utils";
import { JacredParsedTorrent } from "./models";

export default function Command() {
  const [query, setQuery] = useState<string>("");
  const [items, setItems] = useState<JacredParsedTorrent[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { torrserverUrl } = getPreferenceValues<Preferences>();

  useEffect(() => {
    if (query.length >= 3) {
      const timer = setTimeout(() => {
        getList(query);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [query]);

  const getList = async (query: string) => {
    setIsRefreshing(true);
    try {
      const response = await fetch(
        `https://jacred.xyz/api/v1.0/torrents?search=${encodeURIComponent(query)}&apikey=null`,
        {
          method: "GET",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch torrents");
      }

      const data = await response.json();
      if (Array.isArray(data)) {
        // Сортируем список по количеству сидов (sid) в порядке убывания
        const sortedItems = data.sort((a: JacredParsedTorrent, b: JacredParsedTorrent) => b.sid - a.sid);
        setItems(sortedItems);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      showToast(Toast.Style.Failure, "Error", "Failed to fetch torrents");
    } finally {
      setIsRefreshing(false);
    }
  };

  const addTorrentToServer = async (title: string, link: string) => {
    try {
      const response = await fetch(`${torrserverUrl}/torrents`, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "add",
          category: "",
          link,
          poster: "",
          save_to_db: true,
          title,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to add torrent: ${errorText}`);
      }

      showToast(Toast.Style.Success, "Torrent added to server");
    } catch (error) {
      showToast(Toast.Style.Failure, "Error", "Failed to add torrent");
    }
  };

  return (
    <List
      searchBarPlaceholder="Search torrents (min 3 characters)"
      onSearchTextChange={setQuery}
      isLoading={isRefreshing}
    >
      {items.length === 0 ? (
        <List.EmptyView title="No torrents found" />
      ) : (
        items.map((item, index) => (
          <List.Item
            key={index}
            icon={Icon.Download}
            title={item.title}
            subtitle={`Size: ${item.sizeName} | Seeds: ${item.sid} | Peers: ${item.pir}`}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Magnet Link" content={item.magnet} />
                <Action
                  title="Add Torrent to Server"
                  onAction={() => addTorrentToServer(item.title, item.magnet)}
                  icon={Icon.Plus}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
