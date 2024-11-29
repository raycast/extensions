import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { useState } from "react";
import { useBookmarkFilter } from "../hooks/useBookmarkFilter";
import { useConfig } from "../hooks/useConfig";
import { useSearchBookmarks } from "../hooks/useSearchBookmarks";
import { useTranslation } from "../hooks/useTranslation";
import { Bookmark } from "../types";
import { BookmarkItem } from "./BookmarkItem";

interface BookmarkListProps {
  bookmarks: Bookmark[] | undefined;
  hasMore?: boolean;
  isLoading: boolean;
  error?: Error;
  onRefresh?: () => void;
  searchBarPlaceholder?: string;
  emptyViewTitle?: string;
  emptyViewDescription?: string;
  filterFn?: (bookmark: Bookmark) => boolean;
  onSearch?: (text: string) => void;
  loadMore?: () => void;
}

function SearchBookmarkList({ searchText }: { searchText: string }) {
  const { t } = useTranslation();
  const { bookmarks, isLoading: isLoadingBookmarks, revalidate: revalidateBookmarks } = useSearchBookmarks(searchText);
  return (
    <BookmarkList
      bookmarks={bookmarks}
      hasMore={false}
      isLoading={isLoadingBookmarks}
      onRefresh={revalidateBookmarks}
      searchBarPlaceholder={t("bookmarkList.searchPlaceholder")}
      emptyViewTitle={t("bookmarkList.emptySearch.title")}
      emptyViewDescription={t("bookmarkList.emptySearch.description")}
    />
  );
}

export function BookmarkList({
  bookmarks,
  hasMore,
  isLoading,
  onRefresh,
  searchBarPlaceholder,
  emptyViewTitle,
  emptyViewDescription,
  onSearch,
  loadMore,
}: BookmarkListProps) {
  const { t } = useTranslation();
  const { push } = useNavigation();
  const { config } = useConfig();
  const [searchText, setSearchText] = useState("");

  const defaultSearchBarPlaceholder = t("bookmarkList.searchPlaceholder");
  const defaultEmptyViewTitle = t("bookmarkList.loading.title");
  const defaultEmptyViewDescription = t("bookmarkList.loading.description");

  const handleSearchBookmarkList = () => {
    push(<SearchBookmarkList searchText={searchText} />);
  };

  const searchFilteredBookmarks = useBookmarkFilter(bookmarks, searchText);

  const handleCleanCache = () => {};

  const handleSearchTextChange = (text: string) => {
    setSearchText(text);
    onSearch?.(text);
  };

  const onLoadMore = () => {
    loadMore?.();
  };

  if (!bookmarks) {
    return (
      <List>
        <List.EmptyView
          title={emptyViewTitle || defaultEmptyViewTitle}
          icon={Icon.Link}
          description={emptyViewDescription || defaultEmptyViewDescription}
        />
      </List>
    );
  }

  const displayBookmarks = searchFilteredBookmarks || [];
  const listTitle = searchText
    ? t("bookmarkList.filterResults", { searchText, count: displayBookmarks.length })
    : t("bookmarkList.title", { count: displayBookmarks.length });

  const hasMoreNotice = hasMore ? "..." : "";

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={displayBookmarks.length > 0}
      searchBarPlaceholder={searchBarPlaceholder || defaultSearchBarPlaceholder}
      onSearchTextChange={handleSearchTextChange}
      pagination={{
        onLoadMore,
        hasMore: hasMore || false,
        pageSize: 20,
      }}
      navigationTitle={t("bookmarkList.title", { count: displayBookmarks.length })}
    >
      {searchText && (
        <List.Item
          id="search-item"
          icon={Icon.Globe}
          title={t("bookmarkList.onlineSearch.title", { searchText })}
          actions={
            <ActionPanel>
              <Action
                title={t("bookmarkList.onlineSearch.action", { searchText })}
                onAction={handleSearchBookmarkList}
                icon={Icon.Globe}
              />
            </ActionPanel>
          }
        />
      )}
      <List.Section title={`${listTitle}${hasMoreNotice}`}>
        {displayBookmarks.map((bookmark: Bookmark) => (
          <BookmarkItem
            key={`${bookmark.id}-list-item`}
            bookmark={bookmark}
            config={config}
            onRefresh={onRefresh || (() => {})}
            onCleanCache={handleCleanCache}
          />
        ))}
      </List.Section>
    </List>
  );
}
