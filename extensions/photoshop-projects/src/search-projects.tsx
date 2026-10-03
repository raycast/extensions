import { getPreferenceValues, Grid, List, LocalStorage } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { EmptyView } from "./components/EmptyView";
import { ProjectGridItem } from "./components/ProjectGridItem";
import { ProjectListItem } from "./components/ProjectListItem";
import { SortAndFilterDropdown } from "./components/SortAndFilterDropdown";
import { useThumbnails } from "./hooks/useThumbnails";
import { useViewMode } from "./hooks/useViewMode";
import { searchPhotoshopProjects, sortPhotoshopFiles } from "./services/search";
import { ExtensionPreferences, PhotoshopFile, SortOption } from "./types";

const SEARCH_SORT_STORAGE_KEY = "photoshop_search_sort_by";

export default function SearchProjectsCommand() {
  const prefs = getPreferenceValues<ExtensionPreferences>();
  const [files, setFiles] = useState<PhotoshopFile[]>([]);
  const [searchText, setSearchText] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortOption>("name-asc");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const { viewMode, setViewMode, toggleViewMode, columns } = useViewMode();
  const thumbnails = useThumbnails(files);

  useEffect(() => {
    async function loadSavedSort() {
      try {
        const saved = await LocalStorage.getItem<string>(SEARCH_SORT_STORAGE_KEY);
        if (saved) {
          setSortBy(saved as SortOption);
        }
      } catch (error) {
        void error;
      }
    }
    loadSavedSort();
  }, []);

  const handleSortChange = async (newSort: SortOption) => {
    setSortBy(newSort);
    await LocalStorage.setItem(SEARCH_SORT_STORAGE_KEY, newSort);
  };

  const performSearch = async (query: string) => {
    setIsLoading(true);
    try {
      const results = await searchPhotoshopProjects(query, prefs.searchScope || "home");
      setFiles(results);
    } catch {
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    performSearch(searchText);
  }, [searchText]);

  const sortedFiles = useMemo(() => {
    return sortPhotoshopFiles(files, sortBy);
  }, [files, sortBy]);

  const accessory = (
    <SortAndFilterDropdown
      isGrid={viewMode === "grid"}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      sortBy={sortBy}
      onSortChange={handleSortChange}
    />
  );

  if (viewMode === "grid") {
    return (
      <Grid
        columns={columns}
        inset={Grid.Inset.Small}
        isLoading={isLoading}
        searchBarAccessory={accessory}
        searchBarPlaceholder="Search Photoshop projects by name or layer..."
        searchText={searchText}
        onSearchTextChange={setSearchText}
        throttle
      >
        <EmptyView
          isGrid
          title="No Photoshop Projects Found"
          description={
            searchText
              ? `No documents matching "${searchText}" were found on your Mac.`
              : "No Photoshop documents found in the configured search scope."
          }
        />
        {sortedFiles.map((file) => (
          <ProjectGridItem
            key={file.id}
            file={file}
            thumbnailPath={thumbnails[file.path]}
            viewMode={viewMode}
            onToggleViewMode={toggleViewMode}
            onRefresh={() => performSearch(searchText)}
          />
        ))}
      </Grid>
    );
  }

  return (
    <List
      isShowingDetail={sortedFiles.length > 0}
      isLoading={isLoading}
      searchBarAccessory={accessory}
      searchBarPlaceholder="Search Photoshop projects by name or layer..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      throttle
    >
      <EmptyView
        title="No Photoshop Projects Found"
        description={
          searchText
            ? `No documents matching "${searchText}" were found on your Mac.`
            : "No Photoshop documents found in the configured search scope."
        }
      />
      {sortedFiles.map((file) => (
        <ProjectListItem
          key={file.id}
          file={file}
          thumbnailPath={thumbnails[file.path]}
          viewMode={viewMode}
          onToggleViewMode={toggleViewMode}
          onRefresh={() => performSearch(searchText)}
        />
      ))}
    </List>
  );
}
