import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";

import { CachedQueryClientProvider } from "./components/CachedQueryClientProvider";
import { Spaces } from "./views/SpacesView";
import { BookmarkItem } from "./components/BookmarkItem";
import { BookmarkFilter } from "./components/BookmarkFilter";
import { LoginFormInView } from "./components/LoginFormInView";
import { useMe } from "./hooks/use-me.hook";
import { useMyBookmarks } from "./hooks/use-bookmarks.hook";
import { usePrepareBookmarkSearch } from "./hooks/use-prepare-bookmark-search.hook";
import { useBookmarkSearch } from "./hooks/use-bookmark-search.hook";
import { useFilterBookmark } from "./hooks/use-filter-bookmark.hook";
import { RequiredActions } from "./components/BookmarkItemActionPanel";
import { useLoggedOutStatus } from "./hooks/use-logged-out-status.hook";
import { useEnabledSpaces } from "./hooks/use-enabled-spaces.hook";
import { cache } from "./utils/cache.util";
import { useCachedState } from "@raycast/utils";
import { CACHED_KEY_RANKING_ENTRIES } from "./utils/constants.util";
import { RankingEntries } from "./types";
import { trpc } from "./utils/trpc.util";
import { SpaceAuthFormBody } from "./views/SpaceAuthForm";

export function Body() {
  const me = useMe();
  const { enabledSpaceIds } = useEnabledSpaces();
  const { data: authRequiredSpaceIds, refetch: refetchAuthRequiredSpaceIds } =
    trpc.spaceAuth.listAuthRequiredSpaceIds.useQuery();
  const { data, isFetching, isFetched, refetch: refetchBookmarks } = useMyBookmarks();
  const [rankingEntries, setRankingEntries] = useCachedState<RankingEntries>(CACHED_KEY_RANKING_ENTRIES, {});

  const [keyword, setKeyword] = useState("");
  useEffect(() => {
    cache.set("keyword", keyword);
  }, [keyword]);

  const refetch = useCallback(async () => {
    await Promise.all([refetchBookmarks(), me.refetch(), refetchAuthRequiredSpaceIds()]);
  }, [refetchBookmarks, me.refetch, refetchAuthRequiredSpaceIds]);

  const selectedTags = useMemo(() => {
    if (!me.data) return [];

    return me.data.associatedSpaces.flatMap((space) => {
      return space.myTags.map((tag) => `${space.id}:${tag}`);
    });
  }, [me.data]);

  // Prepare bookmark data for fuzzysort search
  // The prepare operation is performed only once if the data doesn't change
  const preparedData = usePrepareBookmarkSearch({ data, selectedTags });

  // First, apply filters based on special characters
  const filteredData = useFilterBookmark({
    keyword,
    taggedPrepare: preparedData.taggedPrepare,
    untaggedPrepare: preparedData.untaggedPrepare,
  });

  // Then, perform search on the filtered results
  const { searchedTaggedList, searchedUntaggedList } = useBookmarkSearch({
    keyword: filteredData.cleanKeyword,
    taggedPrepare: filteredData.filteredTaggedPreparedBookmarks,
    untaggedPrepare: filteredData.filteredUntaggedPreparedBookmarks,
    taggedBookmarks: preparedData.taggedBookmarks,
    untaggedBookmarks: preparedData.untaggedBookmarks,
    rankingEntries,
  });

  const { hasSpaceFilter, hasCreatorFilter, hasTagFilter } = filteredData;
  const hasFilter = hasSpaceFilter || hasCreatorFilter || hasTagFilter;
  const filterText = useMemo(() => {
    const helpTexts = [
      hasSpaceFilter ? `"!<spaceName>"` : "",
      hasCreatorFilter ? `"@<creator>"` : "",
      hasTagFilter ? `"#<tag>#"` : "",
    ].filter(Boolean);

    return hasFilter ? `Filtered by ${helpTexts.join(", ")} pattern` : "";
  }, [hasSpaceFilter, hasCreatorFilter, hasTagFilter, hasFilter]);

  const unauthenticatedSpaceId = useMemo(() => {
    if (!enabledSpaceIds || !authRequiredSpaceIds) {
      return undefined;
    }

    return enabledSpaceIds.find((id) => authRequiredSpaceIds.includes(id));
  }, [enabledSpaceIds, authRequiredSpaceIds]);

  const { loggedOutStatus } = useLoggedOutStatus();
  if (loggedOutStatus) {
    return <LoginFormInView />;
  }

  if (unauthenticatedSpaceId) {
    return <SpaceAuthFormBody spaceId={unauthenticatedSpaceId} refetch={refetch} />;
  }

  if (!data) {
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

  if (searchedTaggedList.length < 1 && searchedUntaggedList.length < 1 && hasFilter) {
    return (
      <List
        isLoading={isFetching || !me.data}
        searchBarAccessory={me.data && enabledSpaceIds && <BookmarkFilter spaceIds={enabledSpaceIds} me={me.data} />}
        searchText={keyword}
        onSearchTextChange={setKeyword}
      >
        <List.Section title={`No results found. ${filterText}`}>
          <List.Item icon={Icon.Folder} title="!<spaceName> (filter by space name) " />
          <List.Item icon={Icon.Person} title="@<creator> (filter by creator) " />
          <List.Item icon={Icon.Tag} title="#<tag># (filter by tag) " />
        </List.Section>
      </List>
    );
  }

  return (
    <List
      isLoading={isFetching || !me.data}
      searchBarAccessory={me.data && enabledSpaceIds && <BookmarkFilter spaceIds={enabledSpaceIds} me={me.data} />}
      searchText={keyword}
      onSearchTextChange={setKeyword}
    >
      {/* Display search results */}
      {searchedTaggedList.length > 0 && (
        <List.Section title={`${searchedTaggedList.length} tagged items${filterText ? ` - ${filterText}` : ""}`}>
          {searchedTaggedList.map((item) => (
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

      {searchedUntaggedList.length > 0 && (
        <List.Section title={`${searchedUntaggedList.length} untagged items${filterText ? ` - ${filterText}` : ""}`}>
          {searchedUntaggedList.map((item) => (
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

export default function Bookmarks() {
  return (
    <CachedQueryClientProvider>
      <Body />
    </CachedQueryClientProvider>
  );
}
