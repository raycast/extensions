import { List } from "@raycast/api";
import { useHistorySearch } from "./hooks/useHistorySearch";
import { ReactElement } from "react";
import { looksLikeUrl } from "./actions";
import { HistoryListEntry, NewTabEntry } from "./components";
import { useEditUrlInSearch } from "./hooks/useEditUrlInSearch";
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
  const { searchText, setSearchText, selectedItemId, editUrlInSearch } = useEditUrlInSearch();
  const { isLoading, errorView, data } = useHistorySearch(searchText);

  if (errorView) {
    return errorView;
  }

  const groupedEntries = groupEntries(data);
  const groups = Array.from(groupedEntries.keys());

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      selectedItemId={selectedItemId}
      isLoading={isLoading}
      throttle={true}
    >
      {looksLikeUrl(searchText ?? "") ? (
        <List.Section title="Open URL" key="open-url">
          <NewTabEntry searchText={searchText} />
        </List.Section>
      ) : null}
      {groups?.map((group) => (
        <List.Section title={group} key={group}>
          {groupedEntries?.get(group)?.map((e) => (
            <HistoryListEntry entry={e} key={e.id} onEditUrl={editUrlInSearch} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
