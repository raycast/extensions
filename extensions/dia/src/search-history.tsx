import { List } from "@raycast/api";
import { useState, ReactElement } from "react";
import { useHistorySearch } from "./hooks/useHistorySearch";
import { HistoryEntry } from "./interfaces";
import { DiaListItems } from "./components/DiaListItems";

/**
 * Group history entries by date
 */
export const groupEntriesByDate = (allEntries?: HistoryEntry[]): Map<string, HistoryEntry[]> =>
  allEntries
    ? allEntries.reduce((acc, cur) => {
        const title = new Date(cur.lastVisited).toLocaleDateString(undefined, {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        const groupEntries = acc.get(title) ?? [];
        groupEntries.push(cur);
        acc.set(title, groupEntries);
        return acc;
      }, new Map<string, HistoryEntry[]>())
    : new Map<string, HistoryEntry[]>();

export default function Command(): ReactElement {
  const [searchText, setSearchText] = useState<string>();
  const { data, isLoading, errorView } = useHistorySearch(searchText);

  if (errorView) {
    return errorView as ReactElement;
  }

  const groupedEntries = groupEntriesByDate(data);
  const groups = Array.from(groupedEntries.keys());

  return (
    <List
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      throttle={true}
      searchBarPlaceholder="Search history..."
    >
      {groups?.map((group) => (
        <List.Section title={group} key={group}>
          {groupedEntries?.get(group)?.map((e) => <DiaListItems.TabHistory key={e.id} entry={e} type="History" />)}
        </List.Section>
      ))}
    </List>
  );
}
