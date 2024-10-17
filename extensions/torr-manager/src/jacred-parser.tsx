import { ActionPanel, Action, List, showToast, Toast, getPreferenceValues, Color, open, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import fetch from "node-fetch";
import { getAuthHeaders, handleDomain } from "./utils";
import { JacredParsedTorrent, TorrentItem } from "./models";

export default function Command() {
  const [query, setQuery] = useState<string>("");
  const [items, setItems] = useState<JacredParsedTorrent[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { torrserverUrl, mediaPlayerApp, jacredParserUrl } = getPreferenceValues<Preferences>();

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
        `${handleDomain(jacredParserUrl)}/api/v1.0/torrents?search=${encodeURIComponent(query)}&apikey=null`,
        {
          method: "GET",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch torrents");
      }

      const data = await response.json();
      if (Array.isArray(data)) {
        const sortedItems = data.sort((a: JacredParsedTorrent, b: JacredParsedTorrent) => b.sid - a.sid);
        setItems(sortedItems);
        showToast(Toast.Style.Success, "Success", `${sortedItems.length} results`);
      } else {
        throw new Error("Invalid response format");
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      showToast(Toast.Style.Failure, "Error", "Nothing found");
    } finally {
      setIsRefreshing(false);
    }
  };

  const addTorrentToServer = async (title: string, link: string, saveToDb = true, openInMediaPlayer = false) => {
    try {
      const response = await fetch(`${handleDomain(torrserverUrl)}/torrents`, {
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
          save_to_db: saveToDb,
          title,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to add torrent: ${errorText}`);
      }

      if (openInMediaPlayer) {
        const data = (await response.json()) as TorrentItem;
        const link = getStreamLink(data);
        open(link, mediaPlayerApp?.path);
      }

      showToast(Toast.Style.Success, "Torrent added to server");
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      showToast(Toast.Style.Failure, "Error", "Failed to add torrent");
    }
  };

  const formatTitle = (title: string, lineLength: number = 10): string[] => {
    const words = title.split(" ");
    const formattedTitle: string[] = [];
    let currentLine = "";

    words.forEach((word, index) => {
      currentLine += word + " ";

      if ((index + 1) % lineLength === 0 || index === words.length - 1) {
        formattedTitle.push(currentLine.trim());
        currentLine = "";
      }
    });

    return formattedTitle;
  };

  const getStreamLink = (item: TorrentItem) => {
    const encodedTitle = encodeURIComponent(item.title);

    return `${torrserverUrl}/stream/[${encodedTitle}] ${encodedTitle}.m3u?link=${item.hash}&m3u&fn=file.m3u`;
  };

  return (
    <List
      isShowingDetail
      searchBarPlaceholder="Search torrents (min 3 characters)"
      onSearchTextChange={setQuery}
      isLoading={isRefreshing}
    >
      {items.length === 0 ? (
        <List.EmptyView title="No torrents found" />
      ) : (
        items.map((item, index) => (
          <List.Item
            title={item.title}
            key={index}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Title" />
                    {formatTitle(item.title).map((titleRow, index) => (
                      <List.Item.Detail.Metadata.Label key={index} title="" text={titleRow} />
                    ))}

                    <List.Item.Detail.Metadata.Separator />

                    <List.Item.Detail.Metadata.TagList title="Stats">
                      <List.Item.Detail.Metadata.TagList.Item text={`Seeds: ${item.sid}`} color={Color.Green} />
                      <List.Item.Detail.Metadata.TagList.Item text={`Peers: ${item.pir}`} color={Color.Red} />
                    </List.Item.Detail.Metadata.TagList>

                    <List.Item.Detail.Metadata.Separator />

                    <List.Item.Detail.Metadata.Label title="Size" text={item.sizeName} />
                    <List.Item.Detail.Metadata.Separator />

                    <List.Item.Detail.Metadata.Label title="Magnet Link" text={item.magnet} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action
                  title={`Open in ${mediaPlayerApp!.name}`}
                  icon={{ source: Icon.Video }}
                  onAction={() => addTorrentToServer(item.title, item.magnet, false, true)}
                />
                <Action
                  icon={{ source: Icon.SaveDocument }}
                  title="Add Torrent to Server"
                  onAction={() => addTorrentToServer(item.title, item.magnet)}
                />
                <Action.CopyToClipboard title="Copy Magnet Link" content={item.magnet} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
