import { getPreferenceValues, List } from "@raycast/api";
import { ReactElement, useState } from "react";
import { Preferences } from "./interfaces";
import { ChromeListItems } from "./components";
import { useTabSearch } from "./hooks/useTabSearch";
import { CHROME_PROFILE_KEY, DEFAULT_CHROME_PROFILE_ID } from "./constants";
import { useHistorySearch } from "./hooks/useHistorySearch";
import { useCachedState } from "@raycast/utils";
import { groupEntries } from "./search-history";
import ChromeProfileDropDown from "./components/ChromeProfileDropdown";
import { useBookmarkSearch } from "./hooks/useBookmarkSearch";

export default function Command() {
  const { useOriginalFavicon } = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState("");
  const { data: tabData, errorView: errorViewTab, isLoading: isLoadingTab } = useTabSearch(searchText);
  const [profile] = useCachedState<string>(CHROME_PROFILE_KEY, DEFAULT_CHROME_PROFILE_ID);
  const {
    data: historyData,
    isLoading: isLoadingHistory,
    errorView: errorViewHistory,
    revalidate: revalidateHistory,
  } = useHistorySearch(profile, searchText);

  const {
    data: bookmarkData,
    isLoading: isLoadingBookmark,
    errorView: errorViewBookmark,
    revalidate: revalidateBookmark,
  } = useBookmarkSearch(searchText);

  if (errorViewHistory) {
    return errorViewHistory as ReactElement;
  }

  if (errorViewBookmark) {
    return errorViewBookmark as ReactElement;
  }

  const groupedEntries = groupEntries(historyData);
  const groups = Array.from(groupedEntries.keys());

  const revalidate = (profile: string) =>{
    revalidateHistory?.(profile);
    revalidateBookmark?.(profile);
  }

  return (
    errorViewTab ?? (
      <List
        isLoading={isLoadingTab && isLoadingHistory}
        onSearchTextChange={setSearchText}
        throttle={true}
        searchBarAccessory={<ChromeProfileDropDown onProfileSelected={revalidate} />}
      >
        {tabData.map((tab) => (
          <ChromeListItems.TabList key={tab.key()} tab={tab} useOriginalFavicon={useOriginalFavicon} />
        ))}

        {groups?.map((group) => (
          <List.Section title={group} key={group}>
            {groupedEntries?.get(group)?.map((e) => (
              <ChromeListItems.TabHistory key={e.id} entry={e} profile={profile} />
            ))}
          </List.Section>
        ))}

        {bookmarkData?.map((e) => (
          <ChromeListItems.TabHistory key={e.id} entry={e} profile={profile} />
        ))}
      </List>
    )
  );
}
