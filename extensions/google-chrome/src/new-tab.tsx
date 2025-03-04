import { useState } from "react";
import { getPreferenceValues, Icon, List } from "@raycast/api";
import { useHistorySearch } from "./hooks/useHistorySearch";
import { ChromeActions, ChromeListItems } from "./components";
import { useTabSearch } from "./hooks/useTabSearch";
import { useCachedState } from "@raycast/utils";
import { ChromeProfile, HistoryEntry, Preferences, SearchResult } from "./interfaces";
import ChromeProfileDropDown from "./components/ChromeProfileDropdown";
import { CHROME_PROFILE_KEY, CHROME_PROFILES_KEY, DEFAULT_CHROME_PROFILE_ID } from "./constants";

type HistoryContainer = {
  profile: ChromeProfile;
} & SearchResult<HistoryEntry>;

function orderByLastVisited(targetId: string, container?: HistoryContainer[]): HistoryContainer[] {
  const element = container?.findIndex((e) => e.profile.id === targetId);
  if (element && container) {
    container.unshift(container.splice(element, 1)[0]);
  }
  return container ?? [];
}

export default function Command() {
  const [searchText, setSearchText] = useState<string>();
  const [profiles] = useCachedState<ChromeProfile[]>(CHROME_PROFILES_KEY);
  const [profile] = useCachedState(CHROME_PROFILE_KEY, DEFAULT_CHROME_PROFILE_ID);
  const profileHistories = profiles?.map((p) => ({ ...useHistorySearch(p.id, searchText), profile: p }));
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
      searchBarAccessory={<ChromeProfileDropDown />}
    >
      <List.Section key={"new-tab"} title={"New Tab"}>
        <List.Item
          title={!searchText ? "Open Empty Tab" : `Search "${searchText}"`}
          icon={{ source: !searchText ? Icon.Plus : Icon.MagnifyingGlass }}
          actions={<ChromeActions.NewTab query={searchText} />}
        />
      </List.Section>
      <List.Section key={"open-tabs"} title={"Open Tabs - All"}>
        {dataTab?.map((tab) => (
          <ChromeListItems.TabList key={tab.key()} tab={tab} useOriginalFavicon={useOriginalFavicon} />
        ))}
      </List.Section>
      {orderByLastVisited(profile, profileHistories).map((p) => (
        <List.Section key={p.profile.id} title={`History - ${p.profile.name}`}>
          {p.data?.map((e) => (
            <ChromeListItems.TabHistory
              key={`${p.profile.id}-${e.id}`}
              entry={e}
              profile={p.profile.id}
              type="History"
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
