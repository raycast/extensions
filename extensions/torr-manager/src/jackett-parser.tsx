import { ActionPanel, Action, List, showToast, Toast, getPreferenceValues, Color, open, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import fetch from "node-fetch";
import { FormData } from "formdata-node";
import { getAuthHeaders, handleDomain, timeoutFetch } from "./utils";
import { JackettParsedTorrent, MOVIE_CATEGORIES, TorrentItem } from "./models";

export default function Command() {
  const [query, setQuery] = useState<string>("");
  const [items, setItems] = useState<JackettParsedTorrent[]>([]);
  const { torrserverUrl, mediaPlayerApp, jackettParserUrl, jackettApiKey } = getPreferenceValues<Preferences>();

  useEffect(() => {
    if (query.length >= 3) {
      const timer = setTimeout(() => {
        getList(query);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [query]);

  const getList = async (query: string) => {
    showToast(Toast.Style.Animated, "Processing...");

    if (!jackettParserUrl) {
      showToast(Toast.Style.Failure, "Error", "Jackett parser url not found");

      return;
    }

    try {
      const params = new URLSearchParams({
        Query: query,
      });

      if (jackettApiKey) {
        params.append("apikey", jackettApiKey);
      }

      MOVIE_CATEGORIES.forEach((category) => {
        params.append("Category", `${category}`);
      });

      const response = await fetch(
        `${handleDomain(jackettParserUrl)}/api/v2.0/indexers/all/results?${params.toString()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch torrents");
      }

      const data = (await response.json()) as { Results: JackettParsedTorrent[] };
      const torrents = data.Results;

      if (Array.isArray(torrents)) {
        const sortedItems = torrents.sort((a: JackettParsedTorrent, b: JackettParsedTorrent) => b.Seeders - a.Seeders);
        setItems(sortedItems);
        showToast(Toast.Style.Success, "", `${sortedItems.length} results`);
      } else {
        showToast(Toast.Style.Failure, "Error", "Invalid response");
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      showToast(Toast.Style.Failure, "Error", "Nothing found");
    }
  };

  const addTorrentToServer = async (title: string, link: string, saveToDb = true, openInMediaPlayer = false) => {
    showToast(Toast.Style.Animated, "Processing...");

    try {
      const fileResponse = await fetch(link);

      if (!fileResponse.ok) {
        throw new Error(`Failed to fetch the torrent file: ${fileResponse.statusText}`);
      }

      const fileBlob = await fileResponse.blob();

      const formData = new FormData();

      if (saveToDb) {
        // we do not care about value, if this key exist it will be saved
        // so do not remove this condition
        formData.append("save", "");
      }

      formData.append("file", fileBlob, title);
      formData.append("title", title);

      const serverUrl = `${handleDomain(torrserverUrl)}/torrent/upload`;
      const uploadResponse = await timeoutFetch(handleDomain(serverUrl), {
        method: "POST",
        body: formData,
        headers: {
          ...getAuthHeaders(),
        },
      });

      if (!uploadResponse.ok) {
        showToast(
          Toast.Style.Failure,
          `Failed to upload torrent: ${uploadResponse.status} ${uploadResponse.statusText}`,
        );
        return;
      }

      showToast(Toast.Style.Success, "Torrent added successfully");

      if (openInMediaPlayer) {
        const data = (await uploadResponse.json()) as TorrentItem;
        const streamLink = getStreamLink(data);
        open(streamLink, mediaPlayerApp?.path);
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      showToast(Toast.Style.Failure, "Error", `Failed to add torrent`);
    }
  };

  const formatTitle = (title: string, lineLength: number = 10): string[] => {
    const words = title ? title.split(" ") : ["-"];
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

    return `${handleDomain(torrserverUrl)}/stream/[${encodedTitle}] ${encodedTitle}.m3u?link=${item.hash}&m3u&fn=file.m3u`;
  };

  const bytesToGbText = (bytes: number): string => {
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  };

  const getFormattedDate = (dateString: string) => {
    if (!dateString) {
      return "";
    }

    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });
  };

  return (
    <List isShowingDetail searchBarPlaceholder="Search torrents (min 3 characters)" onSearchTextChange={setQuery}>
      {items.length === 0 ? (
        <List.EmptyView title="No torrents found" />
      ) : (
        items.map((item, index) => (
          <List.Item
            title={item.Title}
            key={index}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Title" />
                    {formatTitle(item.Title).map((titleRow, index) => (
                      <List.Item.Detail.Metadata.Label key={index} title="" text={titleRow} />
                    ))}

                    <List.Item.Detail.Metadata.Label title="Description" />
                    {formatTitle(item.Description).map((titleRow, index) => (
                      <List.Item.Detail.Metadata.Label key={index} title="" text={titleRow} />
                    ))}

                    <List.Item.Detail.Metadata.Separator />

                    <List.Item.Detail.Metadata.TagList title="Stats">
                      <List.Item.Detail.Metadata.TagList.Item text={`Seeds: ${item.Seeders}`} color={Color.Green} />
                      <List.Item.Detail.Metadata.TagList.Item text={`Peers: ${item.Peers}`} color={Color.Red} />
                      <List.Item.Detail.Metadata.TagList.Item text={`${item.TrackerId}`} color={Color.Blue} />
                    </List.Item.Detail.Metadata.TagList>

                    <List.Item.Detail.Metadata.Separator />

                    <List.Item.Detail.Metadata.Label title="Size" text={bytesToGbText(item.Size)} />
                    <List.Item.Detail.Metadata.Separator />

                    <List.Item.Detail.Metadata.Label title="Publish Date" text={getFormattedDate(item.PublishDate)} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action
                  title={`Open in ${mediaPlayerApp!.name}`}
                  icon={{ source: Icon.Video }}
                  onAction={() => addTorrentToServer(item.Title, item.Link, false, true)}
                />
                <Action
                  icon={{ source: Icon.SaveDocument }}
                  title="Add Torrent to Server"
                  onAction={() => addTorrentToServer(item.Title, item.Link)}
                />
                <Action.OpenInBrowser title="Download Torrent File" url={item.Link} />
                <Action.CopyToClipboard title="Copy Link to Torrent" content={item.Link} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
