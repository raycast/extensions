import { List } from "@raycast/api";
import { useHistorySearch } from "./hooks/useHistorySearch";
import { useState, ReactElement } from "react";
import { HistoryListEntry } from "./components";
import { GroupedEntries, HistoryEntry } from "./interfaces";

const groupEntries = (allEntries?: HistoryEntry[]): GroupedEntries =>
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
  const { isLoading, errorView, data } = useHistorySearch(searchText);

  if (errorView) {
    return errorView;
  }

  const groupedEntries = groupEntries(data);
  const groups = Array.from(groupedEntries.keys());

  return (
    <List onSearchTextChange={setSearchText} isLoading={isLoading} throttle={true}>
      {groups?.map((group) => (
        <List.Section title={group} key={group}>
          {groupedEntries?.get(group)?.map((e) => (
            <HistoryListEntry entry={e} key={e.id} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
