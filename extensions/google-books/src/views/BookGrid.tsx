import { ActionPanel, Grid, Icon } from "@raycast/api";
import { VolumeItem } from "../types/google-books.dt";
import { bookCount, getGridCover } from "../utils/books";
import { BookActionSections } from "../actions/BookActions";

export type ViewMode = "list" | "grid" | "categorized-grid";

interface BookGridProps {
  categorizedItems: Record<string, VolumeItem[]>;
  filteredCategorizedItems: Record<string, VolumeItem[]>;
  totalCount: number;
  activeFilter: string;
  onFilterChange: (value: string) => void;
  isLoading: boolean;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onClearSearch: () => void;
  categorized: boolean;
  searchText?: string;
  onSearchTextChange?: (text: string) => void;
}

function BookGridItem({
  item,
  viewMode,
  onViewModeChange,
  onClearSearch,
}: {
  item: VolumeItem;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onClearSearch: () => void;
}) {
  return (
    <Grid.Item
      content={getGridCover(item)}
      title={item.volumeInfo?.title ?? "Untitled"}
      subtitle={item.volumeInfo?.authors?.[0] ?? "Various Authors"}
      actions={
        <ActionPanel>
          <BookActionSections
            item={item}
            viewMode={viewMode}
            onViewModeChange={onViewModeChange}
            onClearSearch={onClearSearch}
          />
        </ActionPanel>
      }
    />
  );
}

export function BookGrid({
  categorizedItems,
  filteredCategorizedItems,
  totalCount,
  activeFilter,
  onFilterChange,
  isLoading,
  viewMode,
  onViewModeChange,
  onClearSearch,
  categorized,
  searchText,
  onSearchTextChange,
}: BookGridProps) {
  return (
    <Grid
      columns={5}
      aspectRatio="2/3"
      fit={Grid.Fit.Fill}
      navigationTitle={categorized ? "Book Covers (Sorted)" : "Book Covers"}
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={onSearchTextChange}
      searchBarPlaceholder="Search Google Books by keywords..."
      searchBarAccessory={
        <Grid.Dropdown tooltip="Category" value={activeFilter} onChange={onFilterChange}>
          <Grid.Dropdown.Item title={`All (${totalCount})`} value="" />
          {Object.keys(categorizedItems)
            .sort((a, b) => a.localeCompare(b))
            .map((category) => (
              <Grid.Dropdown.Item
                key={category}
                title={`${category} (${categorizedItems[category].length})`}
                value={category}
              />
            ))}
        </Grid.Dropdown>
      }
    >
      <Grid.EmptyView icon={Icon.Book} title="Search Google Books" description="Type a query to find books" />
      {categorized
        ? Object.keys(filteredCategorizedItems).map((category) => (
            <Grid.Section
              key={category}
              title={category}
              subtitle={bookCount(filteredCategorizedItems[category].length)}
            >
              {filteredCategorizedItems[category].map((item) => (
                <BookGridItem
                  key={item.id}
                  item={item}
                  viewMode={viewMode}
                  onViewModeChange={onViewModeChange}
                  onClearSearch={onClearSearch}
                />
              ))}
            </Grid.Section>
          ))
        : Object.values(filteredCategorizedItems)
            .flat()
            .map((item) => (
              <BookGridItem
                key={item.id}
                item={item}
                viewMode={viewMode}
                onViewModeChange={onViewModeChange}
                onClearSearch={onClearSearch}
              />
            ))}
    </Grid>
  );
}
