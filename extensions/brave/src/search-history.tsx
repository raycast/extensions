import { List } from "@raycast/api";
import { useState, ReactElement, useEffect } from "react";
import { useHistorySearch } from "./hooks/useHistorySearch";
import { BraveProfile, GroupedEntries, HistoryEntry } from "./interfaces";
import { BraveListItems } from "./components";
import { useCachedState } from "@raycast/utils";
import { BRAVE_PROFILES_KEY, BRAVE_PROFILE_KEY, DEFAULT_BRAVE_PROFILE_ID } from "./constants";
import BraveProfileDropDown from "./components/BraveProfileDropdown";

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
  const [profiles] = useCachedState<BraveProfile[]>(BRAVE_PROFILES_KEY, [
    { name: "Default", id: DEFAULT_BRAVE_PROFILE_ID },
  ]);
  const [profile] = useCachedState<string>(BRAVE_PROFILE_KEY, DEFAULT_BRAVE_PROFILE_ID);
  const histories = useHistorySearch(profiles, searchText);

  useEffect(() => {
    if (histories[0]) {
      histories[0].revalidate?.(profile);
    }
  }, [profile]);

  const profileHistory = histories.length ? histories.find((e) => e.profile.id == profile) : undefined;

  if (!profileHistory) {
    return <List searchBarAccessory={<BraveProfileDropDown />} />;
  }

  if (profileHistory.errorView) {
    return profileHistory.errorView as ReactElement;
  }

  const groupedEntries = groupEntries(profileHistory.data);
  const groups = Array.from(groupedEntries.keys());

  return (
    <List
      onSearchTextChange={setSearchText}
      isLoading={profileHistory.isLoading}
      throttle={true}
      searchBarAccessory={<BraveProfileDropDown />}
    >
      {groups?.map((group) => (
        <List.Section title={group} key={group}>
          {groupedEntries?.get(group)?.map((e) => (
            <BraveListItems.TabHistory entry={e} key={e.id} profile={profile} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
