import { useState } from "react";

import { Icon, List, getPreferenceValues } from "@raycast/api";
import { useCachedState } from "@raycast/utils";

import { BraveActions, BraveListItems } from "./components";
import BraveProfileDropDown from "./components/BraveProfileDropdown";
import { BRAVE_PROFILES_KEY, BRAVE_PROFILE_KEY, DEFAULT_BRAVE_PROFILE_ID } from "./constants";
import { useHistorySearch } from "./hooks/useHistorySearch";
import { useTabSearch } from "./hooks/useTabSearch";
import type { BraveProfile, HistoryEntry, Preferences, SearchResult } from "./interfaces";

function orderByLastVisited(targetId: string, container?: SearchResult<HistoryEntry>[]): SearchResult<HistoryEntry>[] {
  if (!container?.length) {
    return [];
  }

  const element = container?.findIndex((e) => e.profile.id === targetId);
  if (element && container) {
    container.unshift(container.splice(element, 1)[0]);
  }

  return container ?? [];
}

export default function Command() {
  const [searchText, setSearchText] = useState<string>();
  const [profiles] = useCachedState<BraveProfile[]>(BRAVE_PROFILES_KEY, [
    { name: "Default", id: DEFAULT_BRAVE_PROFILE_ID },
  ]);
  const [profile] = useCachedState<string>(BRAVE_PROFILE_KEY, DEFAULT_BRAVE_PROFILE_ID);
  const profileHistories = useHistorySearch(profiles, searchText);
  const { data: dataTab, isLoading: isLoadingTab, errorView: errorViewTab } = useTabSearch();
  const { useOriginalFavicon } = getPreferenceValues<Preferences>();

  if (errorViewTab || profileHistories?.some((p) => p.errorView)) {
    const errorViewHistory = profileHistories?.find((p) => p.errorView)?.errorView;
    return errorViewTab || errorViewHistory;
  }

  return (
    <List
      onSearchTextChange={setSearchText}
      isLoading={isLoadingTab || profileHistories?.find((p) => p.isLoading)?.isLoading}
      searchBarAccessory={<BraveProfileDropDown />}
    >
      <List.Section key={"new-tab"} title={"New Tab"}>
        <List.Item
          title={!searchText ? "Open New Tab" : `Search "${searchText}"`}
          icon={{ source: !searchText ? Icon.Plus : Icon.MagnifyingGlass }}
          actions={<BraveActions.NewTab query={searchText} />}
        />
        <List.Item
          title={!searchText ? "Open New Incognito Tab" : `Search "${searchText}" In Incognito`}
          icon={{ source: !searchText ? Icon.Plus : Icon.MagnifyingGlass }}
          actions={<BraveActions.NewTab query={searchText} incognito={true} />}
        />
      </List.Section>
      <List.Section key={"open-tabs"} title={"Open Tabs - All"}>
        {dataTab?.map((tab) => (
          <BraveListItems.TabList key={tab.key()} tab={tab} useOriginalFavicon={useOriginalFavicon} />
        ))}
      </List.Section>
      {orderByLastVisited(profile, profileHistories).map((p) => (
        <List.Section key={p.profile.id} title={`History - ${p.profile.name}`}>
          {p.data?.map((e) => (
            <BraveListItems.TabHistory key={`${p.profile.id}-${e.id}`} entry={e} profile={p.profile.id} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
