import { List, ToastStyle, showToast } from "@raycast/api";
import { useState, ReactElement } from "react";
import { UrlListItem } from "./components/UrlListItem";
import { HistoryEntry, useEdgeHistorySearch } from "./hooks/useHistorySearch";

type GroupedEntries = Map<string, HistoryEntry[]>;

export default function Command(): ReactElement {
  const [searchText, setSearchText] = useState<string>();
  const { isLoading, error, entries } = useEdgeHistorySearch(searchText);

  if (error) {
    showToast(ToastStyle.Failure, "An Error Occurred", error.toString());
  }

  const groupedEntries = entries ? groupEntries(entries) : undefined;
  const groups = groupedEntries ? Array.from(groupedEntries.keys()) : undefined;

  return (
    <List onSearchTextChange={setSearchText} isLoading={isLoading} throttle={true}>
      {groups?.map((group) => (
        <List.Section title={group} key={group}>
          {groupedEntries?.get(group)?.map((e) => (
            <UrlListItem entry={e} key={e.id} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

const groupEntries = (allEntries: HistoryEntry[]): GroupedEntries =>
  allEntries.reduce((grouped, e) => {
    const title = groupTitle(e.lastVisited);
    const groupEntries = grouped.get(title) ?? [];
    groupEntries.push(e);
    grouped.set(title, groupEntries);
    return grouped;
  }, new Map<string, HistoryEntry[]>());

const groupTitle = (d: Date): string => {
  return new Date(d.toDateString()).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};
