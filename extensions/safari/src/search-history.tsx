import { List } from "@raycast/api";
import _ from "lodash";
import { useState } from "react";
import { FallbackSearchSection, HistoryListSection } from "./components";
import { useHistorySearch } from "./hooks";
import { groupHistoryByDay } from "./utils";

export default function Command() {
  const [searchText, setSearchText] = useState<string>();
  const { data, permissionView, isLoading } = useHistorySearch(searchText);

  if (permissionView) {
    return permissionView;
  }

  const groupedHistoryEntries = _.chain(data).reduce(groupHistoryByDay, new Map()).value();

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText}>
      {groupedHistoryEntries &&
        Array.from(groupedHistoryEntries.entries()).map(([date, entries]) => (
          <HistoryListSection key={date} title={date} entries={entries} searchText={searchText} />
        ))}
      <FallbackSearchSection searchText={searchText} fallbackSearchType="search" />
    </List>
  );
}
