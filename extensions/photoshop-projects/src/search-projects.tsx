import { getPreferenceValues, Grid, List, LocalStorage, showToast, Toast } from "@raycast/api";
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

  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    searchPhotoshopProjects(searchText, prefs.searchScope || "home")
      .then((results) => {
        if (!cancelled) {
          setFiles(results);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setFiles([]);
          showToast({
            style: Toast.Style.Failure,
            title: "Search failed",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [searchText, prefs.searchScope, refreshTrigger]);

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleFileRenamed = (oldPath: string, newPath: string) => {
    setFiles((prev) =>
      prev.map((f) => {
        if (f.path === oldPath) {
          const slashIdx = newPath.lastIndexOf("/");
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
            onRefresh={handleRefresh}
            onFileRenamed={handleFileRenamed}
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
          onRefresh={handleRefresh}
          onFileRenamed={handleFileRenamed}
        />
      ))}
    </List>
  );
}
