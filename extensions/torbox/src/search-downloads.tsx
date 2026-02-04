import { List, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useState, useMemo } from "react";
import { useDownloads } from "./hooks/useDownloads";
import { DownloadListItem } from "./components/DownloadListItem";

export default function SearchDownloads() {
  const preferences = getPreferenceValues<ExtensionPreferences>();
  const [searchText, setSearchText] = useState("");
  const { data, isLoading, error, revalidate } = useDownloads();

  const filteredDownloads = useMemo(() => {
    if (!data) return [];
    if (!searchText) return data;

    const query = searchText.toLowerCase();
    return data.filter((download) => download.name.toLowerCase().includes(query));
  }, [data, searchText]);

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
      <List.Section title={searchText ? "Search Results" : "All Downloads"} subtitle={`${filteredDownloads.length}`}>
        {filteredDownloads.map((download) => (
          <DownloadListItem
            key={`${download.isQueued ? "queued" : download.type}-${download.id}`}
            download={download}
            apiKey={preferences.apiKey}
            onRefresh={revalidate}
          />
        ))}
      </List.Section>
    </List>
  );
}
