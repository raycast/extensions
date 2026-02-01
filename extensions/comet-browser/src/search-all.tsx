import { getPreferenceValues, List } from "@raycast/api";
import { useState } from "react";
import { Preferences } from "./interfaces";
import { CometListItems } from "./components";
import { useTabSearch } from "./hooks/useTabSearch";
import { COMET_PROFILE_KEY, DEFAULT_COMET_PROFILE_ID } from "./constants";
import { useHistorySearch } from "./hooks/useHistorySearch";
import { useCachedState, useCachedPromise } from "@raycast/utils";
import { groupEntriesByDate } from "./search-history";
import { getBookmarks } from "./util";

export default function Command() {
  const { useOriginalFavicon } = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState("");
  const [profile] = useCachedState<string>(
    COMET_PROFILE_KEY,
    DEFAULT_COMET_PROFILE_ID,
  );

  // Fetch tabs data
  const { data: tabData, isLoading: isLoadingTab } = useTabSearch(searchText);

  // Fetch history data
  const { data: historyData = [], isLoading: isLoadingHistory } =
    useHistorySearch(profile, searchText);

  // Fetch bookmarks data using centralized utility function
  const { data: bookmarkData, isLoading: isLoadingBookmark } = useCachedPromise(
    async () => {
      const bookmarks = await getBookmarks();
      if (searchText) {
        return bookmarks.filter(
          (bookmark) =>
            bookmark.title.toLowerCase().includes(searchText.toLowerCase()) ||
            bookmark.url.toLowerCase().includes(searchText.toLowerCase()),
        );
      }
      return bookmarks;
    },
    [searchText],
    {
      keepPreviousData: true,
    },
  );

  return (
    <List
      isLoading={isLoadingTab || isLoadingHistory || isLoadingBookmark}
      onSearchTextChange={setSearchText}
      throttle={true}
    >
      <List.Section title="Tabs">
        {tabData.length === 0 ? (
          <List.Item title="No tabs found" key={"empty tab list item"} />
        ) : (
          tabData.map((tab) => (
            <CometListItems.TabList
              key={tab.key()}
              tab={tab}
              useOriginalFavicon={useOriginalFavicon}
            />
          ))
        )}
      </List.Section>

      {historyData.length === 0 ? (
        <List.Section title="History">
          <List.Item title="No history found" />
        </List.Section>
      ) : (
        Array.from(
          groupEntriesByDate(historyData).entries(),
          ([groupDate, group]) => (
            <List.Section title={"History " + groupDate} key={groupDate}>
              {group.map((e) => (
                <CometListItems.TabHistory
                  key={e.id}
                  entry={e}
                  profile={profile}
                  type="History"
                />
              ))}
            </List.Section>
          ),
        )
      )}

      <List.Section title="Bookmarks">
        {bookmarkData?.length === 0 ? (
          <List.Item
            title="No bookmarks found"
            key={"empty bookmark list item"}
          />
        ) : (
          bookmarkData?.map((e) => (
            <CometListItems.TabHistory
              key={e.id}
              entry={e}
              profile={profile}
              type="Bookmark"
            />
          ))
        )}
      </List.Section>
    </List>
  );
}
