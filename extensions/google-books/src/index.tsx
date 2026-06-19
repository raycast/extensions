import { Icon, List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useCallback, useMemo, useState } from "react";
import { useSearch } from "./hooks/useSearch";
import { VolumeItem } from "./types/google-books.dt";
import { bookCount } from "./utils/books";
import { BookListItem } from "./views/BookListItem";
import { BookGrid } from "./views/BookGrid";
import type { ViewMode } from "./views/BookGrid";

export default function SearchGoogleBooks() {
  const [showDetail, setShowDetail] = useCachedState("show-detail", true);
  const [viewMode, setViewMode] = useCachedState<ViewMode>("view-mode", "list");
  const [searchText, setSearchText] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const { items, loading, clearCache } = useSearch(searchText);

  const toggleDetail = useCallback(() => {
    setShowDetail((prev) => !prev);
  }, [setShowDetail]);

  const handleSearchTextChange = useCallback(
    (text: string) => {
      setSearchText(text);
    },
    [setSearchText],
  );

  const handleClearSearch = useCallback(() => {
    setSearchText("");
    setActiveFilter("");
    clearCache();
    setViewMode("list");
  }, [setSearchText, setActiveFilter, clearCache, setViewMode]);

  const categorizedItems = useMemo(
    () =>
      items.reduce((acc: Record<string, VolumeItem[]>, item: VolumeItem) => {
        const category = item.volumeInfo?.categories ? item.volumeInfo?.categories[0] : "Other";
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(item);
        return acc;
      }, {}),
    [items],
  );

  const filteredCategorizedItems = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(categorizedItems).filter(([category]) => !activeFilter || category === activeFilter),
      ),
    [categorizedItems, activeFilter],
  );

  const totalCount = items.length;

  if (viewMode === "categorized-grid" || viewMode === "grid") {
    return (
      <BookGrid
        categorizedItems={categorizedItems}
        filteredCategorizedItems={filteredCategorizedItems}
        totalCount={totalCount}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        isLoading={loading}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onClearSearch={handleClearSearch}
        categorized={viewMode === "categorized-grid"}
        searchText={searchText}
        onSearchTextChange={handleSearchTextChange}
      />
    );
  }

  return (
    <List
      throttle
      isShowingDetail={showDetail}
      searchBarPlaceholder="Search Google Books by keywords..."
      navigationTitle="Search Google Books"
      isLoading={loading}
      onSearchTextChange={handleSearchTextChange}
      searchText={searchText}
      searchBarAccessory={
        <List.Dropdown tooltip="Category" value={activeFilter} onChange={setActiveFilter}>
          <List.Dropdown.Item title={`All (${totalCount})`} value="" />
          {Object.keys(categorizedItems)
            .sort((a, b) => a.localeCompare(b))
            .map((category) => (
              <List.Dropdown.Item
                key={category}
                title={`${category} (${categorizedItems[category].length})`}
                value={category}
              />
            ))}
        </List.Dropdown>
      }
    >
      <List.EmptyView icon={Icon.Book} title="Search Google Books" description="Type a query to find books" />
      {Object.keys(filteredCategorizedItems).map((category) => (
        <List.Section key={category} title={category} subtitle={bookCount(filteredCategorizedItems[category].length)}>
          {filteredCategorizedItems[category].map((item) => (
            <BookListItem
              key={item.id}
              item={item}
              showDetail={showDetail}
              toggleDetail={toggleDetail}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              onClearSearch={handleClearSearch}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
