import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";

import { CachedQueryClientProvider } from "./components/CachedQueryClientProvider";
import { Spaces } from "./views/SpacesView";
import { BookmarkItem } from "./components/BookmarkItem";
import { LoginFormInView } from "./components/LoginFormInView";
import { useMe } from "./hooks/use-me.hook";
import { useMyBookmarks } from "./hooks/use-bookmarks.hook";
import { usePrepareBookmarkSearch } from "./hooks/use-prepare-bookmark-search.hook";
import { useBookmarkSearch } from "./hooks/use-bookmark-search.hook";
import { useFilterBookmark } from "./hooks/use-filter-bookmark.hook";
import { useFaviconBackfill } from "./hooks/use-favicon-backfill.hook";
import { RequiredActions } from "./components/BookmarkItemActionPanel";
import { useLoggedOutStatus } from "./hooks/use-logged-out-status.hook";
import { useUserCacheReset } from "./hooks/use-user-cache-reset.hook";
import { cache } from "./utils/cache.util";
import { useCachedState } from "@raycast/utils";
import { CACHED_KEY_RANKING_ENTRIES } from "./utils/constants.util";
import { RankingEntries } from "./types";

export function Body() {
  const me = useMe();
  const { data, isError, isFetching, isFetched, refetch: refetchBookmarks } = useMyBookmarks();
  const [rankingEntries, setRankingEntries] = useCachedState<RankingEntries>(CACHED_KEY_RANKING_ENTRIES, {});

  const [keyword, setKeyword] = useState("");
  useEffect(() => {
    cache.set("keyword", keyword);
  }, [keyword]);

  const refetch = useCallback(async () => {
    await Promise.all([refetchBookmarks(), me.refetch()]);
  }, [refetchBookmarks, me.refetch]);

  // Resolve favicons for bookmarks that lack one in the background and report them to the server
  // (the local cache is updated at the same time).
  useFaviconBackfill(data);

  // Prepare bookmark data for fuzzysort search
  // The prepare operation is performed only once if the data doesn't change
  const preparedData = usePrepareBookmarkSearch({ data });

  // First, apply filters based on special characters
  const filteredData = useFilterBookmark({
    keyword,
    prepared: preparedData.prepared,
  });

  // Then, perform search on the filtered results
  const { searchedList } = useBookmarkSearch({
    keyword: filteredData.cleanKeyword,
    prepared: filteredData.filteredPrepared,
    bookmarks: preparedData.bookmarks,
    rankingEntries,
  });

  // Raycast List keeps the previously selected item (by id) even when the items are reordered,
  // so while typing "o" → "ok" a non-top item can stay selected after the ranking changes.
  // Select the first result whenever the keyword changes, but respect manual moves within the same keyword.
  //
  // Do not feed manual moves back into selectedItemId. Holding an arrow key moves the cursor faster
  // than a render round-trip, so a fed-back id arrives stale and pulls the cursor back, bouncing
  // between two items (#798). After the first manual move, pass undefined so Raycast keeps its own
  // selection; the next keyword change then sets the first item again, even if it is the same id.
  const firstItemId = searchedList[0]?.id;
  const [movedManually, setMovedManually] = useState(false);
  const selectedItemId = movedManually ? undefined : firstItemId;
  const handleSearchTextChange = useCallback((text: string) => {
    setKeyword(text);
    setMovedManually(false);
  }, []);
  const handleSelectionChange = useCallback(
    (itemId: string | null) => {
      // null can arrive transiently while the list is being updated; ignore it.
      if (itemId === null || itemId === firstItemId) return;
      setMovedManually(true);
    },
    [firstItemId],
  );

  const { hasSpaceFilter, hasCreatorFilter, hasTagFilter } = filteredData;
  const hasFilter = hasSpaceFilter || hasCreatorFilter || hasTagFilter;
  const filterText = useMemo(() => {
    const helpTexts = [
      hasSpaceFilter ? `"!<spaceName>"` : "",
      hasCreatorFilter ? `"@<creator>"` : "",
      hasTagFilter ? `"#<tag>"` : "",
    ].filter(Boolean);

    return hasFilter ? `Filtered by ${helpTexts.join(", ")} pattern` : "";
  }, [hasSpaceFilter, hasCreatorFilter, hasTagFilter, hasFilter]);

  const { loggedOutStatus } = useLoggedOutStatus();
  useUserCacheReset(me.data?.email);
  if (loggedOutStatus) {
    return <LoginFormInView />;
  }

  if (!data) {
    // No usable cache and the request failed (e.g. offline): show a retry state instead of
    // an indefinite loading indicator.
    if (isError) {
      return (
        <List>
          <List.EmptyView
            icon={Icon.WifiDisabled}
            title="Could not load bookmarks"
            description="Check your internet connection and try again."
            actions={
              <ActionPanel>
                <Action title="Retry" icon={Icon.ArrowClockwise} onAction={refetch} />
                <RequiredActions refetch={refetch} />
              </ActionPanel>
            }
          />
        </List>
      );
    }

    return <List isLoading={true} />;
  }

  if (isFetched && data.length === 0) {
    return (
      <List isLoading={isFetching || !me.data}>
        <List.Item
          title="No bookmark. Add a bookmark to get started"
          icon={Icon.Plus}
          actions={
            <ActionPanel>
              <RequiredActions refetch={refetch} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Spaces"
          icon={Icon.Folder}
          actions={
            <ActionPanel>
              <Action.Push title="Spaces" icon={Icon.Folder} target={<Spaces />} />
              <RequiredActions refetch={refetch} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (searchedList.length < 1 && hasFilter) {
    return (
      <List isLoading={isFetching || !me.data} searchText={keyword} onSearchTextChange={handleSearchTextChange}>
        <List.Section title={`No results found. ${filterText}`}>
          <List.Item icon={Icon.Folder} title="!<spaceName> (filter by space name) " />
          <List.Item icon={Icon.Person} title="@<creator> (filter by creator) " />
          <List.Item icon={Icon.Tag} title="#<tag> (filter by tag) " />
        </List.Section>
      </List>
    );
  }

  return (
    <List
      isLoading={isFetching || !me.data}
      searchText={keyword}
      onSearchTextChange={handleSearchTextChange}
      selectedItemId={selectedItemId}
      onSelectionChange={handleSelectionChange}
    >
      {/* Display search results */}
      {searchedList.length > 0 && (
        <List.Section title={`${searchedList.length} items${filterText ? ` - ${filterText}` : ""}`}>
          {searchedList.map((item) => (
            <BookmarkItem
              key={item.id}
              bookmark={item}
              me={me.data}
              refetch={refetch}
              rankingEntries={rankingEntries}
              setRankingEntries={setRankingEntries}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

export default function Bookmarks(props: { launchContext?: { token?: string } }) {
  return (
    <CachedQueryClientProvider launchContext={props.launchContext}>
      <Body />
    </CachedQueryClientProvider>
  );
}
