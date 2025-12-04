import { getPreferenceValues, List } from "@raycast/api";
import { useState, useEffect, useMemo } from "react";
import { CometListItems } from "./components";
import { useTabSearch } from "./hooks/useTabSearch";
import { COMET_PROFILE_KEY, DEFAULT_COMET_PROFILE_ID, MAX_SEARCH_ALL_RESULTS } from "./constants";
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

  // ALL hooks must be called before any conditional returns
  const revalidate = (profile: string) => {
    revalidateHistory?.(profile);
    revalidateBookmark(profile);
  };

  // Limit results to prevent memory issues with optimized memoization
  const limitedTabData = useMemo(() => tabData.slice(0, MAX_SEARCH_ALL_RESULTS), [tabData]);
  const limitedHistoryData = useMemo(() => historyData.slice(0, MAX_SEARCH_ALL_RESULTS), [historyData]);
  const limitedBookmarkData = useMemo(() => bookmarkData.slice(0, MAX_SEARCH_ALL_RESULTS), [bookmarkData]);

  // Memoize grouped history data to avoid recalculating on every render
  // Add dependency on length to avoid recomputing when data changes but length remains the same
  const groupedHistoryData = useMemo(() => {
    return limitedHistoryData.length === 0
      ? null
      : Array.from(groupEntriesByDate(limitedHistoryData).entries(), ([groupDate, group]) => ({
          groupDate,
          group,
        }));
  }, [limitedHistoryData, limitedHistoryData.length]);

  // If profile check is still pending, don't render anything
  if (profileValid === null) {
    return null;
  }

  // If profile is invalid, don't render anything (toast already shown)
  if (!profileValid) {
    return null;
  }

  return (
    <List
      // loading appears not to matter, but leaving it case it handles a case that I'm unaware of
      isLoading={isLoadingTab || isLoadingHistory || isLoadingBookmark}
      onSearchTextChange={setSearchText}
      throttle={true}
      searchBarAccessory={<CometProfileDropDown onProfileSelected={revalidate} />}
    >
      {/* use Item for titles instead of sections for explicit feedback that the list is empty */}
      <List.Section
        title={`Tabs${tabData.length > MAX_SEARCH_ALL_RESULTS ? ` (showing ${MAX_SEARCH_ALL_RESULTS} of ${tabData.length})` : ""}`}
      >
        {limitedTabData.length === 0 ? (
          <List.Item title="No tabs found" key={"empty tab list item"} />
        ) : (
          limitedTabData.map((tab) => (
            <CometListItems.TabList key={tab.key()} tab={tab} useOriginalFavicon={useOriginalFavicon} />
          ))
        )}
      </List.Section>

      {limitedHistoryData.length === 0 ? (
        <List.Section title="History">
          <List.Item title="No history found" />
        </List.Section>
      ) : (
        groupedHistoryData?.map(({ groupDate, group }) => (
          <List.Section
            title={`History ${groupDate}${limitedHistoryData.length >= MAX_SEARCH_ALL_RESULTS ? ` (showing ${MAX_SEARCH_ALL_RESULTS}+)` : ""}`}
            key={groupDate}
          >
            {group.map((e) => (
              <CometListItems.TabHistory key={e.id} entry={e} profile={profile} type="History" />
            ))}
          </List.Section>
        ))
      )}

      <List.Section
        title={`Bookmarks${bookmarkData.length > MAX_SEARCH_ALL_RESULTS ? ` (showing ${MAX_SEARCH_ALL_RESULTS} of ${bookmarkData.length})` : ""}`}
      >
        {limitedBookmarkData.length === 0 ? (
          <List.Item title="No bookmarks found" key={"empty bookmark list item"} />
        ) : (
          limitedBookmarkData.map((e) => (
            <CometListItems.TabHistory key={e.id} entry={e} profile={profile} type="Bookmark" />
          ))
        )}
      </List.Section>
    </List>
  );
}
