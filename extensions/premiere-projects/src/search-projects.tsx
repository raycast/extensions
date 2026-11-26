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
import { SortOption } from "./types";

const SEARCH_SORT_STORAGE_KEY = "premiere_search_sort_by";

export default function SearchProjectsCommand() {
  const prefs = getPreferenceValues<Preferences>();
  const defaultScope = prefs.searchScope === "all" ? "global" : "home";

  const [searchText, setSearchText] = useState<string>("");

  useEffect(() => {
    async function migrateLegacyStorage() {
      try {
        const item = await LocalStorage.getItem(SEARCH_SORT_STORAGE_KEY);
        if (typeof item === "string") {
          try {
            JSON.parse(item);
          } catch {
            await LocalStorage.setItem(SEARCH_SORT_STORAGE_KEY, JSON.stringify(item));
          }
        }
      } catch {
        // Non-blocking
      }
    }
    migrateLegacyStorage();
  }, []);

  const { value: sortBy = "name-asc", setValue: setSortBy } = useLocalStorage<SortOption>(
    SEARCH_SORT_STORAGE_KEY,
    "name-asc",
  );

  const { value: selectedLocation = defaultScope, setValue: setSelectedLocation } = useLocalStorage<string>(
    "premiere_search_location",
    defaultScope,
  );

  const effectiveScope = selectedLocation || defaultScope;

  const {
    data: files = [],
    isLoading,
    error,
    revalidate,
    mutate,
  } = usePromise(
    async (term: string, scope: string) => {
      return await searchPremiereProjects(term, scope);
    },
    [searchText, effectiveScope],
  );

  const { viewMode, setViewMode, toggleViewMode, columns } = useViewMode();
  const thumbnails = useThumbnails(files);

  const handleSortChange = (newSort: SortOption) => {
    setSortBy(newSort);
  };

  const handleLocationChange = (newLoc: string) => {
    setSelectedLocation(newLoc);
  };

  const handleFileRenamed = (oldPath: string, newPath: string) => {
    mutate(Promise.resolve(), {
      optimisticUpdate(currentFiles) {
        if (!currentFiles) return [];
        return currentFiles.map((f) => {
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
        });
      },
      shouldRevalidateAfter: false,
    });
  };

  const handleFileDeleted = (deletedPath: string) => {
    mutate(Promise.resolve(), {
      optimisticUpdate(currentFiles) {
        if (!currentFiles) return [];
        return currentFiles.filter((f) => f.path !== deletedPath);
      },
      shouldRevalidateAfter: false,
    });
  };

  const sortedFiles = useMemo(() => {
    if (error) return [];
    return sortPremiereFiles(files, sortBy);
  }, [files, sortBy, error]);

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
