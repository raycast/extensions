import { List } from "@raycast/api";
import { useState, ReactElement } from "react";
import { useHistorySearch } from "./hooks/useHistorySearch";
import { GroupedEntries, HistoryEntry } from "./interfaces";
import { CometListItems } from "./components";
import { useCachedState } from "@raycast/utils";
import { COMET_PROFILE_KEY, DEFAULT_COMET_PROFILE_ID } from "./constants";

export const groupEntriesByDate = (
  allEntries?: HistoryEntry[],
): GroupedEntries =>
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
  const [searchText, setSearchText] = useState<string>("");
  const [profile] = useCachedState<string>(
    COMET_PROFILE_KEY,
    DEFAULT_COMET_PROFILE_ID,
  );
  const { data, isLoading } = useHistorySearch(profile, searchText);

  const groupedEntries = groupEntriesByDate(data);
  const groups = Array.from(groupedEntries.keys());

  return (
    <List
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      throttle={true}
    >
      {groups?.map((group) => (
        <List.Section title={group} key={group}>
          {groupedEntries?.get(group)?.map((e) => (
            <CometListItems.TabHistory
              key={e.id}
              entry={e}
              profile={profile}
              type="History"
            />
          ))}
        </List.Section>
      ))}
      {groups?.length === 0 && !isLoading && (
        <List.EmptyView
          title="No History Found"
          description="No history entries match your search."
        />
      )}
    </List>
  );
}
