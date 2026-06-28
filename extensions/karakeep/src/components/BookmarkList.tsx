import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useBookmarkFilter } from "../hooks/useBookmarkFilter";
import { useConfig } from "../hooks/useConfig";
import { useEnsureScrollablePagination } from "../hooks/usePrefetchPagination";
import { useSearchBookmarks } from "../hooks/useSearchBookmarks";
import { useTranslation } from "../hooks/useTranslation";
import { Bookmark } from "../types";
import { BookmarkItem } from "./BookmarkItem";
interface BookmarkListProps {
  bookmarks: Bookmark[] | undefined;
  pagination?: {
    pageSize: number;
    hasMore: boolean;
    onLoadMore: () => void;
  };
  isLoading: boolean;
  error?: Error;
  onRefresh?: () => void;
  searchBarPlaceholder?: string;
  emptyViewTitle?: string;
  emptyViewDescription?: string;
  onSearch?: (text: string) => void;
  onBookmarkVisit?: (bookmark: Bookmark) => void;
  /** Override the item label used in the section title and navigation title (e.g. "Notes" instead of "Bookmarks") */
  itemLabel?: string;
  /** Optional accessory element rendered in the search bar (e.g. a List.Dropdown for filtering) */
  searchBarAccessory?: Parameters<typeof List>[0]["searchBarAccessory"];
}
function SearchBookmarkList({ searchText }: { searchText: string }) {
  const { t } = useTranslation();
  const { bookmarks, isLoading: isLoadingBookmarks, revalidate: revalidateBookmarks } = useSearchBookmarks(searchText);

  return (
    <BookmarkList
      bookmarks={bookmarks}
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
  pagination,
  isLoading,
  onRefresh,
  searchBarPlaceholder,
  emptyViewTitle,
  emptyViewDescription,
  onSearch,
  onBookmarkVisit,
  itemLabel,
  searchBarAccessory,
}: BookmarkListProps) {
  const { t } = useTranslation();
  const { push } = useNavigation();
  const { config } = useConfig();
  const [searchText, setSearchText] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>(undefined);

  const defaultValues = useMemo(
    () => ({
      searchBarPlaceholder: t("bookmarkList.searchPlaceholder"),
      emptyViewTitle: t("bookmarkList.loading.title"),
      emptyViewDescription: t("bookmarkList.loading.description"),
    }),
    [t],
  );

  const handleSearchBookmarkList = useCallback(() => {
    push(<SearchBookmarkList searchText={searchText} />);
  }, [searchText, push]);

  const handleSearchTextChange = useCallback(
    (text: string) => {
      setSearchText(text);
      onSearch?.(text);
    },
    [onSearch],
  );

  // Pagination is handled directly by Raycast's List component

  const searchFilteredBookmarks = useBookmarkFilter(bookmarks || [], searchText);

  const displayInfo = useMemo(() => {
    const displayBookmarks = searchFilteredBookmarks || [];
    const label = itemLabel ?? t("bookmarkList.title", { count: displayBookmarks.length }).replace(/ \(\d+\)$/, "");
    const listTitle = searchText
      ? t("bookmarkList.filterResultsLabel", { label, searchText, count: displayBookmarks.length })
      : itemLabel
        ? `${itemLabel} (${displayBookmarks.length})`
        : t("bookmarkList.title", { count: displayBookmarks.length });
    const hasMoreNotice = pagination?.hasMore ? "..." : "";

    return {
      displayBookmarks,
      listTitle,
      hasMoreNotice,
    };
  }, [searchFilteredBookmarks, searchText, pagination?.hasMore, t, itemLabel]);

  // Best-practice fix: avoid a pagination deadlock when reopening a command.
  // If we render only the cached first page and the list isn't scrollable, Raycast won't trigger `onLoadMore`.
  // Prefetch one extra page once, but only when not filtering locally.
  useEnsureScrollablePagination({
    pagination,
    isLoading,
    itemCount: displayInfo.displayBookmarks.length,
    enabled: searchText.trim().length === 0,
  });

  useEffect(() => {
    const firstId = displayInfo.displayBookmarks[0]?.id;
    if (!firstId) {
      if (selectedItemId) setSelectedItemId(undefined);
      return;
    }

    if (!selectedItemId) {
      setSelectedItemId(firstId);
      return;
    }

    const exists = displayInfo.displayBookmarks.some((b) => b.id === selectedItemId);
    if (!exists) setSelectedItemId(firstId);
  }, [displayInfo.displayBookmarks, selectedItemId]);

  if (!bookmarks) {
    return (
      <List>
        <List.EmptyView
          title={emptyViewTitle || defaultValues.emptyViewTitle}
          icon={Icon.Link}
          description={emptyViewDescription || defaultValues.emptyViewDescription}
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={displayInfo.displayBookmarks.length > 0}
      searchBarPlaceholder={searchBarPlaceholder || defaultValues.searchBarPlaceholder}
      searchBarAccessory={searchBarAccessory}
      searchText={searchText}
      onSearchTextChange={handleSearchTextChange}
      onSelectionChange={(id) => setSelectedItemId(id ?? undefined)}
      pagination={pagination}
      navigationTitle={displayInfo.listTitle}
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
      <List.Section title={`${displayInfo.listTitle}${displayInfo.hasMoreNotice}`}>
        {displayInfo.displayBookmarks.map((bookmark: Bookmark) => (
          <BookmarkItem
            key={`${bookmark.id}-list-item`}
            bookmark={bookmark}
            config={config}
            onRefresh={onRefresh || (() => {})}
            onVisit={onBookmarkVisit}
            isSelected={selectedItemId === bookmark.id}
          />
        ))}
      </List.Section>
    </List>
  );
}
