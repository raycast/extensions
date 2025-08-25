import { getPreferenceValues, List } from "@raycast/api";
import { useState, useEffect } from "react";
import { Preferences } from "./interfaces";
import { CometListItems } from "./components";
import { useTabSearch } from "./hooks/useTabSearch";
import { COMET_PROFILE_KEY, DEFAULT_COMET_PROFILE_ID } from "./constants";
import { useHistorySearch } from "./hooks/useHistorySearch";
import { useCachedState } from "@raycast/utils";
import { groupEntriesByDate } from "./search-history";
import CometProfileDropDown from "./components/CometProfileDropdown";
import { useBookmarkSearch } from "./hooks/useBookmarkSearch";
import { checkProfileConfiguration } from "./util";

export default function Command() {
  const { useOriginalFavicon } = getPreferenceValues<Preferences>();
  const [profileValid, setProfileValid] = useState<boolean | null>(null);
  const [searchText, setSearchText] = useState("");
  const [profile] = useCachedState<string>(COMET_PROFILE_KEY, DEFAULT_COMET_PROFILE_ID);

  useEffect(() => {
    const checkProfile = async () => {
      const isValid = await checkProfileConfiguration();
      setProfileValid(isValid);
    };
    checkProfile();
  }, []);

  // Call ALL hooks BEFORE any conditional returns
  const { data: tabData, isLoading: isLoadingTab } = useTabSearch(searchText);

  // Always call with enabled=true to maintain hook consistency, filter results later
  const {
    data: historyData = [],
    isLoading: isLoadingHistory,
    revalidate: revalidateHistory,
  } = useHistorySearch(profile, searchText, true);

  const {
    data: bookmarkData = [],
    isLoading: isLoadingBookmark,
    revalidate: revalidateBookmark,
  } = useBookmarkSearch(searchText);

  // If profile check is still pending, don't render anything
  if (profileValid === null) {
    return null;
  }

  // If profile is invalid, don't render anything (toast already shown)
  if (!profileValid) {
    return null;
  }

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
      searchBarAccessory={<CometProfileDropDown onProfileSelected={revalidate} />}
    >
      {/* use Item for titles instead of sections for explicit feedback that the list is empty */}
      <List.Section title="Tabs">
        {tabData.length === 0 ? (
          <List.Item title="No tabs found" key={"empty tab list item"} />
        ) : (
          tabData.map((tab) => (
            <CometListItems.TabList key={tab.key()} tab={tab} useOriginalFavicon={useOriginalFavicon} />
          ))
        )}
      </List.Section>

      {historyData.length === 0 ? (
        <List.Section title="History">
          <List.Item title="No history found" />
        </List.Section>
      ) : (
        Array.from(groupEntriesByDate(historyData).entries(), ([groupDate, group]) => (
          <List.Section title={"History " + groupDate} key={groupDate}>
            {group.map((e) => (
              <CometListItems.TabHistory key={e.id} entry={e} profile={profile} type="History" />
            ))}
          </List.Section>
        ))
      )}

      <List.Section title="Bookmarks">
        {bookmarkData.length === 0 ? (
          <List.Item title="No bookmarks found" key={"empty bookmark list item"} />
        ) : (
          bookmarkData.map((e) => <CometListItems.TabHistory key={e.id} entry={e} profile={profile} type="Bookmark" />)
        )}
      </List.Section>
    </List>
  );
}
