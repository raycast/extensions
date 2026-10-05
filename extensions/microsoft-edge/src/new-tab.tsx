import { useState } from "react";
import { Icon, List } from "@raycast/api";
import { useHistorySearch } from "./hooks/useHistorySearch";
import { EdgeActions, EdgeListItems } from "./components";
import { useTabSearch } from "./hooks/useTabSearch";
import { useCachedState } from "@raycast/utils";
import { EdgeProfile, HistoryEntry, SearchResult } from "./types/interfaces";
import EdgeProfileDropdown from "./components/EdgeProfileDropdown";
import { ALL_PROFILES_CACHE_KEY, DEFAULT_PROFILE_ID } from "./constants";
import { getCurrentProfileCacheKey } from "./utils/appUtils";

type HistoryContainer = {
  profile: EdgeProfile;
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
  const [profiles] = useCachedState<EdgeProfile[]>(ALL_PROFILES_CACHE_KEY);
  const [profile] = useCachedState(getCurrentProfileCacheKey(), DEFAULT_PROFILE_ID);
  const profileHistories = profiles?.map((p) => ({ ...useHistorySearch(p.id, searchText), profile: p }));
  const { data, isLoading, errorView, revalidate } = useTabSearch();

  if (errorView || profileHistories?.some((p) => p.errorView)) {
    const errorViewHistory = profileHistories?.find((p) => p.errorView)?.errorView;
    return errorView || errorViewHistory;
  }

  return (
    <List
      onSearchTextChange={setSearchText}
      isLoading={isLoading || profileHistories?.find((p) => p.isLoading)?.isLoading}
      searchBarAccessory={<EdgeProfileDropdown onProfileSelected={revalidate} />}
    >
      <List.Section key={"new-tab"} title={"New Tab"}>
        <List.Item
          title={!searchText ? "Open Empty Tab" : `Search "${searchText}"`}
          icon={{ source: !searchText ? Icon.Plus : Icon.MagnifyingGlass }}
          actions={<EdgeActions.NewTab query={searchText} />}
        />
      </List.Section>
      <List.Section key={"open-tabs"} title={"Open Tabs - All"}>
        {data?.map((tab) => (
          <EdgeListItems.TabList key={tab.key()} tab={tab} />
        ))}
      </List.Section>
      {orderByLastVisited(profile, profileHistories)
        .filter((p) => !!p)
        .map((p) => (
          <List.Section key={p.profile.id} title={`History - ${p.profile.name}`}>
            {p.data?.map((e) => (
              <EdgeListItems.TabHistory key={`${p.profile.id}-${e.id}`} entry={e} profile={p.profile.id} />
            ))}
          </List.Section>
        ))}
    </List>
  );
}
