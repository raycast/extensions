import { useCallback, useState } from "react";
import { List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { LibraryType, QueryOrder } from "./types";
import { useLibraries } from "./hooks/use-libraries";
import { SortDropdown } from "./components/sort-dropdown";
import { LibraryListItem } from "./components/library-list-item";

export default function SearchLibraries() {
  const [searchText, setSearchText] = useState("");
  const [isShowingDetail, setIsShowingDetail] = useCachedState("is-showing-detail", true);
  const [sortOrder, setSortOrder] = useState<QueryOrder>("relevance");
  const [filter, setFilter] = useState<string>("");

  const { libraries, isLibrariesLoading, librariesPagination } = useLibraries(searchText, sortOrder, filter);

  const onSortChange = useCallback((newValue: string) => {
    setSortOrder(newValue as QueryOrder);
    setFilter("");
  }, []);

  const onFilterChange = useCallback((newFilter: string) => {
    setFilter(newFilter);
    // Reset sort order to default when applying a filter
    setSortOrder("relevance");
  }, []);

  return (
    <List
      isLoading={isLibrariesLoading}
      isShowingDetail={isShowingDetail}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search libraries..."
      searchBarAccessory={<SortDropdown onSortChange={onSortChange} onFilterChange={onFilterChange} />}
      pagination={librariesPagination}
    >
      {(libraries as LibraryType[])?.map((library, index: number) => (
        <LibraryListItem
          key={`list-item-${index}-${library.github.name}`}
          library={library}
          isShowingDetail={isShowingDetail}
          setIsShowingDetail={setIsShowingDetail}
        />
      ))}
    </List>
  );
}
