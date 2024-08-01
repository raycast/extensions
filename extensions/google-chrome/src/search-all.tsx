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
      // isLoading={isLoadingTab || isLoadingHistory || isLoadingBookmark}
      onSearchTextChange={setSearchText}
      throttle={true}
      searchBarAccessory={<ChromeProfileDropDown onProfileSelected={revalidate} />}
    >
      <List.Section title="Tabs">
        {tabData.map((tab) => (
          <ChromeListItems.TabList key={tab.key()} tab={tab} useOriginalFavicon={useOriginalFavicon} />
        ))}
      </List.Section>

      <List.Section title="History">
        {Array.from(groupEntriesByDate(historyData).entries(), ([groupDate, group]) =>
          [<List.Item title={groupDate} key={groupDate} />].concat(
            group.map((e) => <ChromeListItems.TabHistory key={e.id} entry={e} profile={profile} />)
          )
        )}
      </List.Section>

      <List.Section title="Bookmarks">
        {bookmarkData.map((e) => (
          <ChromeListItems.TabHistory key={e.id} entry={e} profile={profile} />
        ))}
      </List.Section>
    </List>
  );
}
