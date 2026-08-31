import { List, ReactElement } from "@raycast/api";
import { useHistorySearch } from "./hooks/useHistorySearch";
import { HistoryListEntry } from "./components";
import { GroupedEntries, HistoryEntry } from "./interfaces";
import { useState } from "react";

const groupEntries = (allEntries?: HistoryEntry[]): GroupedEntries =>
  (allEntries ?? []).reduce((acc, cur) => {
    const title = new Date(cur.lastVisited).toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    acc.set(title, [...(acc.get(title) ?? []), cur]);
    return acc;
  }, new Map<string, HistoryEntry[]>());

export default function Command(): ReactElement {
  const [searchText, setSearchText] = useState<string>();
  const { isLoading, errorView, data } = useHistorySearch(searchText);

  if (errorView) {
    return errorView;
  }

  const groupedEntries = groupEntries(data);

  return (
    <List onSearchTextChange={setSearchText} isLoading={isLoading} throttle={true}>
      {Array.from(groupedEntries.entries()).map(([group, entries]) => (
        <List.Section title={group} key={group}>
          {entries.map((e) => (
            <HistoryListEntry entry={e} key={e.id} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
