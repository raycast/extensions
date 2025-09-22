import { List } from "@raycast/api";
import { useState, ReactElement, useEffect } from "react";
import { useHistorySearch } from "./hooks/useHistorySearch";
import { GroupedEntries, HistoryEntry } from "./interfaces";
import { CometListItems } from "./components";
import CometProfileDropDown from "./components/CometProfileDropdown";
import { useCachedState } from "@raycast/utils";
import { COMET_PROFILE_KEY, DEFAULT_COMET_PROFILE_ID } from "./constants";
import { checkProfileConfiguration } from "./util";

export const groupEntriesByDate = (allEntries?: HistoryEntry[]): GroupedEntries =>
  allEntries
    ? allEntries.reduce((acc, cur) => {
        const title = "Historique";
        const groupEntries = acc.get(title) ?? [];
        groupEntries.push(cur);
        acc.set(title, groupEntries);
        return acc;
      }, new Map<string, HistoryEntry[]>())
    : new Map<string, HistoryEntry[]>();

export default function Command(): ReactElement | null {
  const [profileValid, setProfileValid] = useState<boolean | null>(null);
  const [searchText, setSearchText] = useState("");
  const [profile, setProfile] = useCachedState<string>(COMET_PROFILE_KEY, DEFAULT_COMET_PROFILE_ID);

  useEffect(() => {
    const checkProfile = async () => {
      const isValid = await checkProfileConfiguration();
      setProfileValid(isValid);
    };
    checkProfile();
  }, []);

  // Call hooks BEFORE any conditional returns
  // Always call with enabled=true to maintain hook consistency, filter results later
  const { data, isLoading, errorView } = useHistorySearch(profile, searchText, true);

  // If profile check is still pending, don't render anything
  if (profileValid === null) {
    return null;
  }

  // If profile is invalid, don't render anything (toast already shown)
  if (!profileValid) {
    return null;
  }

  const handleProfileChange = (profileId: string) => {
    setProfile(profileId);
  };

  const groupedEntries = groupEntriesByDate(data);
  const groups = Array.from(groupedEntries.keys());

  if (errorView) {
    return errorView as ReactElement;
  }

  return (
    <List
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      throttle={true}
      searchBarAccessory={<CometProfileDropDown onProfileSelected={handleProfileChange} />}
    >
      {groups?.map((group) => (
        <List.Section title={group} key={group}>
          {groupedEntries?.get(group)?.map((e) => (
            <CometListItems.TabHistory key={e.id} entry={e} profile={profile} type="History" />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
