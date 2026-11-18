import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useEffect, useState } from "react";
import MusicAssistantClient from "./music-assistant/music-assistant-client";
import { BrowseTab } from "./music-library-hub/browse-tab";
import { QueueManagerTab } from "./music-library-hub/queue-manager-tab";
import { RecentlyPlayedTab } from "./music-library-hub/recently-played-tab";
import { SearchTab } from "./music-library-hub/search-tab";
import { BreadcrumbState, LibraryTab } from "./music-library-hub/types";

export default function MusicLibraryHubCommand() {
  const client = new MusicAssistantClient();
  const [activeTab, setActiveTab] = useState<LibraryTab>("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [browseState, setBrowseState] = useCachedState<BreadcrumbState>("browse-state", { view: "artists" });

  const clearSearch = () => {
    setSearchQuery("");
    setDebouncedSearchQuery("");
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <List
      navigationTitle="Music Library Hub"
      searchBarPlaceholder="Search your library..."
      searchText={searchQuery}
      onSearchTextChange={setSearchQuery}
      throttle
    >
      <List.Section title="Browse By">
        <List.Item
          title="Artists & Albums"
          icon={Icon.Folder}
          actions={
            <ActionPanel>
              <Action
                title="View"
                onAction={() => {
                  clearSearch();
                  setActiveTab("browse");
                }}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Recently Played"
          icon={Icon.Clock}
          actions={
            <ActionPanel>
              <Action
                title="View"
                onAction={() => {
                  clearSearch();
                  setActiveTab("recent");
                }}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Queue Manager"
          icon={Icon.List}
          actions={
            <ActionPanel>
              <Action
                title="View"
                onAction={() => {
                  clearSearch();
                  setActiveTab("queue");
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      {debouncedSearchQuery && debouncedSearchQuery.trim().length > 0 && (
        <SearchTab client={client} searchQuery={debouncedSearchQuery} onClearSearch={clearSearch} />
      )}

      {!debouncedSearchQuery || debouncedSearchQuery.trim().length === 0 ? (
        <>
          {activeTab === "browse" && (
            <BrowseTab client={client} browseState={browseState} setBrowseState={setBrowseState} />
          )}
          {activeTab === "recent" && <RecentlyPlayedTab client={client} />}
          {activeTab === "queue" && <QueueManagerTab client={client} />}
        </>
      ) : null}
    </List>
  );
}
