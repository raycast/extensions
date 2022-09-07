import { List, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { groupHistoryByDay } from "./utils";
import useHistorySearch from "src/hooks/useHistorySearch";
import HistoryListSection from "src/components/HistoryListSection";

export default function Command() {
  const [searchText, setSearchText] = useState<string>();
  const { results, error, isLoading } = useHistorySearch(searchText);

  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Cannot search history",
      message: error instanceof Error ? error.message : undefined,
    });
  }

  const groupedHistoryEntries = results?.reduce(groupHistoryByDay, new Map());

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText}>
      {groupedHistoryEntries &&
        Array.from(groupedHistoryEntries.entries()).map(([date, entries]) => (
          <HistoryListSection key={date} title={date} entries={entries} searchText={searchText} />
        ))}
    </List>
  );
}
