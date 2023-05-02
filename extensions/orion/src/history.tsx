import { List } from "@raycast/api";
import { useState } from "react";
import { groupHistoryByDay } from "./utils";
import useHistorySearch from "src/hooks/useHistorySearch";
import HistoryListSection from "src/components/HistoryListSection";

export default function Command() {
  const [searchText, setSearchText] = useState<string>();
  const { data, isLoading, permissionView } = useHistorySearch(searchText);

  if (permissionView) {
    return permissionView;
  }

  const groupedHistoryEntries = data?.reduce(groupHistoryByDay, new Map());

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText}>
      {groupedHistoryEntries &&
        Array.from(groupedHistoryEntries.entries()).map(([date, entries]) => (
          <HistoryListSection key={date} title={date} entries={entries} searchText={searchText} />
        ))}
    </List>
  );
}
