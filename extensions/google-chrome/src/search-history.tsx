import { List } from "@raycast/api";
import { useState, ReactElement } from "react";
import { useHistorySearch } from "./hooks/useHistorySearch";
import { GroupedEntries, HistoryEntry } from "./interfaces";
import { ChromeListItems } from "./components";
import ChromeProfileDropDown from "./components/ChromeProfileDropdown";
import { useCachedState } from "@raycast/utils";
import { CHROME_PROFILE_KEY, DEFAULT_CHROME_PROFILE_ID } from "./constants";

export const groupEntriesByDate = (allEntries?: HistoryEntry[]): GroupedEntries =>
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
  const [profile] = useCachedState<string>(CHROME_PROFILE_KEY, DEFAULT_CHROME_PROFILE_ID);
  const { data, isLoading, errorView, revalidate } = useHistorySearch(profile, searchText);

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
      searchBarAccessory={<ChromeProfileDropDown onProfileSelected={revalidate} />}
    >
      {groups?.map((group) => (
        <List.Section title={group} key={group}>
          {groupedEntries?.get(group)?.map((e) => (
            <ChromeListItems.TabHistory key={e.id} entry={e} profile={profile} type="History" />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
