import { ActionPanel, Action, List, getPreferenceValues, Icon, Color, open } from "@raycast/api";
import { useState, useMemo } from "react";
import os from "os";
import path from "path";
import { unescapeHTML, formatFullDate, parseTorrentTitle } from "./utils/formatters";
import { handleDownloadAction } from "./utils/actions";
import { useSearchTorrents } from "./hooks/useSearchTorrents";
import { BASE_URL_DETAILS, FREELEECH_DETECTION_REGEX } from "./utils/constants";

export default function SearchTorrents() {
  const preferences = getPreferenceValues<Preferences>();
  const targetDir = preferences.downloadDir || path.join(os.homedir(), "Downloads");
  const [searchText, setSearchText] = useState("");
  const [isFreeOnly, setIsFreeOnly] = useState(false);

  const { feeds, activeFeedUrl, setActiveFeedUrl, torrents, isLoading, lastFetch, forceRefresh } = useSearchTorrents();

  const filteredTorrents = useMemo(() => {
    return torrents.filter((item) => {
      const decodedTitle = unescapeHTML(item.title || "").toLowerCase();
      const matchesSearch = decodedTitle.includes(searchText.toLowerCase());
      const matchesFree = !isFreeOnly || FREELEECH_DETECTION_REGEX.test(decodedTitle);
      return matchesSearch && matchesFree;
    });
  }, [torrents, searchText, isFreeOnly]);

  if (!isLoading && feeds.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Rss}
          title="No Feeds Configured"
          description="Open the 'Manage Feeds' command to add your RSS links."
        />
      </List>
    );
  }

  const minutesAgo = lastFetch ? Math.floor((Date.now() - lastFetch) / 60000) : 0;
  const timeStr = lastFetch ? (minutesAgo === 0 ? "Now" : `${minutesAgo} min`) : "---";
  const cacheStatus = lastFetch ? `${timeStr} (cache)` : "---";
  const activeFeedName = feeds.find((f) => f.url === activeFeedUrl)?.name || "Feed";

  const handleSearchOnSite = () => {
    const searchUrl = `https://bj-share.info/torrents.php?searchstr=${encodeURIComponent(searchText)}`;
    open(searchUrl);
  };

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={true}
      searchBarPlaceholder={`Search in ${activeFeedName}...`}
      navigationTitle={`${activeFeedName} | ${cacheStatus}`}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        feeds.length > 1 ? (
          <List.Dropdown tooltip="Change Section" onChange={setActiveFeedUrl} value={activeFeedUrl}>
            {feeds.map((f) => (
              <List.Dropdown.Item key={f.id} title={f.name} value={f.url} />
            ))}
          </List.Dropdown>
        ) : null
      }
    >
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title="No results found"
        description="Try another term or search directly on the site."
        actions={
          <ActionPanel>
            <Action title="Search on Site" icon={Icon.Globe} onAction={handleSearchOnSite} />
          </ActionPanel>
        }
      />
      {filteredTorrents.map((item, index) => {
        const uniqueKey = item.link || String(index);
        const decodedTitle = unescapeHTML(item.title || "Unknown");
        const isFree = FREELEECH_DETECTION_REGEX.test(decodedTitle);
        const { cleanTitle, specs } = parseTorrentTitle(decodedTitle);

        let detailsUrl = "";
        let torrentId = "";
        try {
          const id = new URL(item.link || "").searchParams.get("id");
          if (id) {
            torrentId = id;
            detailsUrl = `${BASE_URL_DETAILS}${id}`;
          }
        } catch (error: unknown) {
          console.error(`Failed to extract ID from URL (${item.link}):`, error);
        }

        return (
          <List.Item
            key={uniqueKey}
            icon={"🧲"}
            title={{ value: cleanTitle, tooltip: cleanTitle }}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Title" text={cleanTitle} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.TagList title="Status">
                      <List.Item.Detail.Metadata.TagList.Item
                        text={isFree ? "FREELEECH" : "Standard"}
                        color={isFree ? Color.Green : Color.SecondaryText}
                      />
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Label title="Size" text={item.contentSnippet || "Unknown"} />
                    <List.Item.Detail.Metadata.Label
                      title="Seeders"
                      text={item.seeders || "0"}
                      icon={{ source: Icon.ArrowUp, tintColor: Color.Green }}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Leechers"
                      text={item.leechers || "0"}
                      icon={{ source: Icon.ArrowDown, tintColor: Color.Red }}
                    />
                    <List.Item.Detail.Metadata.Label title="Specs" text={specs || "None"} />
                    <List.Item.Detail.Metadata.Label title="Release" text={`${formatFullDate(item.pubDate)}`} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action
                  title="Download & Open Torrent"
                  icon={Icon.Download}
                  onAction={() => handleDownloadAction(item, targetDir)}
                />
                {detailsUrl && <Action.OpenInBrowser title="View on Site" url={detailsUrl} />}
                {item.link && (
                  <Action.OpenInBrowser
                    title="Open Download Link in Browser"
                    url={item.link}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                  />
                )}

                <ActionPanel.Section>
                  {item.link && (
                    <Action.CopyToClipboard
                      title="Copy Link"
                      content={item.link}
                      shortcut={{ modifiers: ["cmd"], key: "l" }}
                    />
                  )}
                  {torrentId && (
                    <Action.CopyToClipboard
                      title="Copy ID"
                      content={torrentId}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
                    />
                  )}
                </ActionPanel.Section>

                <ActionPanel.Section>
                  <Action
                    title="Freeleech Only"
                    icon={isFreeOnly ? Icon.CheckCircle : Icon.Circle}
                    onAction={() => setIsFreeOnly(!isFreeOnly)}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                  />
                  <Action
                    title="Force Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={forceRefresh}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
