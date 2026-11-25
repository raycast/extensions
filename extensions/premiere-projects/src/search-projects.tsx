import { Action, ActionPanel, getPreferenceValues, Grid, Icon, List, LocalStorage } from "@raycast/api";
import { useLocalStorage, usePromise } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { EmptyView } from "./components/EmptyView";
import { ProjectGridItem } from "./components/ProjectGridItem";
import { ProjectListItem } from "./components/ProjectListItem";
import { SortAndFilterDropdown } from "./components/SortAndFilterDropdown";
import { useThumbnails } from "./hooks/useThumbnails";
import { useViewMode } from "./hooks/useViewMode";
import { searchPremiereProjects, sortPremiereFiles } from "./services/search";
import { PremiereFile, SortOption } from "./types";

const SEARCH_SORT_STORAGE_KEY = "premiere_search_sort_by";

export default function SearchProjectsCommand() {
  const prefs = getPreferenceValues<Preferences>();
  const defaultScope = prefs.searchScope === "all" ? "global" : "home";

  const [searchText, setSearchText] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortOption>("name-asc");

  const { value: selectedLocation = defaultScope, setValue: setSelectedLocation } = useLocalStorage<string>(
    "premiere_search_location",
    defaultScope,
  );

  const effectiveScope = selectedLocation || defaultScope;

  const {
    data: searchResults,
    isLoading,
    error,
    revalidate,
  } = usePromise(
    async (term: string, scope: string) => {
      return await searchPremiereProjects(term, scope);
    },
    [searchText, effectiveScope],
  );

  const [files, setFiles] = useState<PremiereFile[]>([]);

  useEffect(() => {
    if (searchResults) {
      setFiles(searchResults);
    } else if (error) {
      setFiles([]);
    }
  }, [searchResults, error]);

  const { viewMode, setViewMode, toggleViewMode, columns } = useViewMode();
  const thumbnails = useThumbnails(files);

  useEffect(() => {
    async function loadSavedSort() {
      try {
        const savedSort = await LocalStorage.getItem<string>(SEARCH_SORT_STORAGE_KEY);
        if (savedSort) {
          setSortBy(savedSort as SortOption);
        }
      } catch {
        // Fallback to default
      }
    }
    loadSavedSort();
  }, []);

  const handleSortChange = async (newSort: SortOption) => {
    setSortBy(newSort);
    await LocalStorage.setItem(SEARCH_SORT_STORAGE_KEY, newSort);
  };

  const handleLocationChange = (newLoc: string) => {
    setSelectedLocation(newLoc);
  };

  const handleFileRenamed = (oldPath: string, newPath: string) => {
    setFiles((prev) =>
      prev.map((f) => {
        if (f.path === oldPath) {
          const slashIdx = Math.max(newPath.lastIndexOf("/"), newPath.lastIndexOf("\\"));
          const newName = slashIdx >= 0 ? newPath.slice(slashIdx + 1) : newPath;
          const dotIdx = newName.lastIndexOf(".");
          const newTitle = dotIdx > 0 ? newName.slice(0, dotIdx) : newName;
          return {
            ...f,
            id: newPath,
            path: newPath,
            name: newName,
            title: newTitle,
          };
        }
        return f;
      }),
    );
  };

  const handleFileDeleted = (deletedPath: string) => {
    setFiles((prev) => prev.filter((f) => f.path !== deletedPath));
  };

  const sortedFiles = useMemo(() => {
    return sortPremiereFiles(files, sortBy);
  }, [files, sortBy]);

  const accessory = (
    <SortAndFilterDropdown
      isGrid={viewMode === "grid"}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      sortBy={sortBy}
      onSortChange={handleSortChange}
      selectedLocation={selectedLocation}
      onLocationChange={handleLocationChange}
    />
  );

  const emptyView = error ? (
    <EmptyView
      isGrid={viewMode === "grid"}
      icon={Icon.Warning}
      title="Search Failed"
      description={error.message || "An error occurred while searching for Premiere Pro projects."}
      actions={
        <ActionPanel>
          <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
        </ActionPanel>
      }
    />
  ) : (
    <EmptyView
      isGrid={viewMode === "grid"}
      title="No Premiere Pro Projects Found"
      description={
        searchText
          ? `No documents matching "${searchText}" were found.`
          : "No Premiere Pro projects found in the configured search scope."
      }
    />
  );

  if (viewMode === "grid") {
    return (
      <Grid
        columns={columns}
        inset={Grid.Inset.Small}
        isLoading={isLoading}
        searchBarAccessory={accessory}
        searchBarPlaceholder="Search Premiere Pro projects by name or sequence..."
        searchText={searchText}
        onSearchTextChange={setSearchText}
        throttle
      >
        {emptyView}
        {sortedFiles.map((file) => (
          <ProjectGridItem
            key={file.id}
            file={file}
            thumbnailPath={thumbnails[file.path]}
            viewMode={viewMode}
            onToggleViewMode={toggleViewMode}
            onRefresh={revalidate}
            onFileRenamed={handleFileRenamed}
            onFileDeleted={handleFileDeleted}
          />
        ))}
      </Grid>
    );
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarAccessory={accessory}
      searchBarPlaceholder="Search Premiere Pro projects by name or sequence..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      throttle
    >
      {emptyView}
      {sortedFiles.map((file) => (
        <ProjectListItem
          key={file.id}
          file={file}
          thumbnailPath={thumbnails[file.path]}
          viewMode={viewMode}
          onToggleViewMode={toggleViewMode}
          onRefresh={revalidate}
          onFileRenamed={handleFileRenamed}
          onFileDeleted={handleFileDeleted}
        />
      ))}
    </List>
  );
}
