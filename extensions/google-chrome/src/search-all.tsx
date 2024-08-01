import { getPreferenceValues, List } from "@raycast/api";
import { ReactElement, useState } from "react";
import { Preferences } from "./interfaces";
import { ChromeListItems } from "./components";
import { useTabSearch } from "./hooks/useTabSearch";
import { CHROME_PROFILE_KEY, DEFAULT_CHROME_PROFILE_ID } from "./constants";
import { useHistorySearch } from "./hooks/useHistorySearch";
import { useCachedState } from "@raycast/utils";
import { groupEntriesByDate } from "./search-history";
import ChromeProfileDropDown from "./components/ChromeProfileDropdown";
import { useBookmarkSearch } from "./hooks/useBookmarkSearch";

export default function Command() {
  const { useOriginalFavicon } = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState("");
  const [profile] = useCachedState<string>(CHROME_PROFILE_KEY, DEFAULT_CHROME_PROFILE_ID);

  const { data: tabData, isLoading: isLoadingTab } = useTabSearch(searchText);

  const {
    data: historyData,
    isLoading: isLoadingHistory,
    revalidate: revalidateHistory,
  } = useHistorySearch(profile, searchText);

  const {
    data: bookmarkData,
    isLoading: isLoadingBookmark,
    revalidate: revalidateBookmark,
  } = useBookmarkSearch(searchText);

  const revalidate = (profile: string) => {
    revalidateHistory?.(profile);
    revalidateBookmark(profile);
  };

  return (
    <List
      // loading appears not to matter, but leaving it case it handles a case that I'm unaware of
      isLoading={isLoadingTab || isLoadingHistory || isLoadingBookmark}
      onSearchTextChange={setSearchText}
      throttle={true}
      searchBarAccessory={<ChromeProfileDropDown onProfileSelected={revalidate} />}
    >
      {/* use Item for titles instead of sections for explicit feedback that the list is empty */}
      <List.Item title="Tabs" />
      {tabData.map((tab) => (
        <ChromeListItems.TabList key={tab.key()} tab={tab} useOriginalFavicon={useOriginalFavicon} />
      ))}

      <List.Item title="History" />
      {Array.from(groupEntriesByDate(historyData).entries(), ([groupDate, group]) => (
        <List.Section title={groupDate} key={groupDate}>
          {group.map((e) => (
            <ChromeListItems.TabHistory key={e.id} entry={e} profile={profile} />
          ))}
        </List.Section>
      ))}

      <List.Item title="Bookmarks" />
      {bookmarkData.map((e) => (
        <ChromeListItems.TabHistory key={e.id} entry={e} profile={profile} />
      ))}
    </List>
  );
}
