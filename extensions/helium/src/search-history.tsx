import { Icon, LaunchProps, List } from "@raycast/api";
import { useState } from "react";
import { useHistorySearch } from "./utils/history";
import { HistoryListItem } from "./utils/list-items";

export default function SearchHistory(props: LaunchProps) {
  const [searchText, setSearchText] = useState(props.fallbackText ?? "");
  const { data: history, isAvailable, isLoading, permissionView, revalidate } = useHistorySearch(searchText, 25);

  if (permissionView) {
    return permissionView;
  }

  const isSearching = searchText.trim().length > 0;

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search browsing history..."
      throttle
    >
      {!isAvailable && !isLoading && (
        <List.EmptyView
          icon={Icon.Clock}
          title="History unavailable"
          description="No readable Helium History database was found"
        />
      )}

      {isAvailable && history.length === 0 && !isLoading && isSearching && (
        <List.EmptyView icon={Icon.Clock} title="No history found" />
      )}

      {isAvailable && history.length === 0 && !isLoading && !isSearching && (
        <List.EmptyView icon={Icon.Clock} title="No recent history" />
      )}

      {history.length > 0 && (
        <List.Section
          title={isSearching ? "History" : "Recent History"}
          subtitle={`${history.length} entr${history.length !== 1 ? "ies" : "y"}`}
        >
          {history.map((entry) => (
            <HistoryListItem key={entry.id} entry={entry} revalidate={revalidate} />
          ))}
        </List.Section>
      )}
    </List>
  );
}
