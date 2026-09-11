import { List, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useState, useMemo } from "react";
import { useDownloads } from "./hooks/useDownloads";
import { useVideoPlayers } from "./hooks/useVideoPlayers";
import { DownloadListItem } from "./components/DownloadListItem";
import { RecentDownloadListItem } from "./components/RecentDownloadListItem";
import { useRecentDownloads } from "./hooks/useRecentDownloads";

export default function SearchDownloads() {
  const preferences = getPreferenceValues<ExtensionPreferences>();
  const [searchText, setSearchText] = useState("");
  const { data, isLoading, error, revalidate } = useDownloads();
  const videoPlayers = useVideoPlayers();
  const { recentDownloads, recordRecent } = useRecentDownloads(preferences.apiKey);

  const filteredDownloads = useMemo(() => {
    if (!data) return [];
    if (!searchText) return data;

    const query = searchText.toLowerCase();
    return data.filter((download) => download.name.toLowerCase().includes(query));
  }, [data, searchText]);

  const availableRecents = useMemo(() => {
    if (!data || searchText) return [];

    return recentDownloads.flatMap((recent) => {
      const download = data.find((item) => item.id === recent.downloadId && item.type === recent.type);
      if (!download || (recent.fileId !== undefined && !download.files.some((file) => file.id === recent.fileId))) {
        return [];
      }
      return [{ recent, download }];
    });
  }, [data, recentDownloads, searchText]);

  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to fetch downloads",
      message: error.message,
    });
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search your TorBox downloads..."
      throttle
    >
      {availableRecents.length > 0 && (
        <List.Section title="Recent" subtitle={`${availableRecents.length}`}>
          {availableRecents.map(({ recent, download }) => (
            <RecentDownloadListItem
              key={`${recent.type}-${recent.downloadId}-${recent.fileId ?? "folder"}`}
              recent={recent}
              download={download}
              apiKey={preferences.apiKey}
              videoPlayers={videoPlayers}
              onOpen={recordRecent}
            />
          ))}
        </List.Section>
      )}
      <List.Section title={searchText ? "Search Results" : "All Downloads"} subtitle={`${filteredDownloads.length}`}>
        {filteredDownloads.map((download) => (
          <DownloadListItem
            key={`${download.isQueued ? "queued" : download.type}-${download.id}`}
            download={download}
            apiKey={preferences.apiKey}
            videoPlayers={videoPlayers}
            onRefresh={revalidate}
            onOpen={recordRecent}
          />
        ))}
      </List.Section>
    </List>
  );
}
