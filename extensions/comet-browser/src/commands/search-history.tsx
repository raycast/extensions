import { List, Icon } from "@raycast/api";
import { useState, useMemo } from "react";
import { useCometHistory } from "../hooks/useCometHistory";
import { HistoryListItem } from "../components/HistoryListItem";
import { searchEngine } from "../lib/search";

export default function SearchHistory() {
  const [searchText, setSearchText] = useState("");

  const { data: history, isLoading, error } = useCometHistory("", 200); // Increased limit for better search results

  // Filter history based on search text directly using Fuse.js
  const filteredHistory = useMemo(() => {
    return searchEngine.searchHistory(searchText, history);
  }, [searchText, history]);

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Cannot access history"
          description="Unable to read Comet browser history. Please make sure Comet is installed and you have the necessary permissions."
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search browser history..."
      throttle
      searchText={searchText}
      filtering={false}
    >
      {filteredHistory.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No history found"
          description={searchText ? "Try a different search term" : "No browsing history available"}
        />
      ) : (
        <List.Section
          title="History"
          subtitle={`${filteredHistory.length} ${filteredHistory.length === 1 ? "entry" : "entries"}`}
        >
          {filteredHistory.map((entry) => (
            <HistoryListItem key={entry.id} entry={entry} />
          ))}
        </List.Section>
      )}
    </List>
  );
}
