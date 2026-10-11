import { getPreferenceValues, Grid, List, LocalStorage } from "@raycast/api";
import path from "node:path";
import { useEffect, useMemo, useRef, useState } from "react";
import { EmptyView } from "./components/EmptyView";
import { ProjectGridItem } from "./components/ProjectGridItem";
import { ProjectListItem } from "./components/ProjectListItem";
import { SortAndFilterDropdown } from "./components/SortAndFilterDropdown";
import { useThumbnails } from "./hooks/useThumbnails";
import { useViewMode } from "./hooks/useViewMode";
import { searchPhotoshopProjects, sortPhotoshopFiles } from "./services/search";
import { PhotoshopFile, SortOption } from "./types";
import { createPhotoshopFile } from "./utils/spotlight";

const SEARCH_SORT_STORAGE_KEY = "photoshop_search_sort_by";

export default function SearchProjectsCommand() {
  const prefs = getPreferenceValues<Preferences.SearchProjects>();
  const [files, setFiles] = useState<PhotoshopFile[]>([]);
  const [searchText, setSearchText] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortOption>("name-asc");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const searchIdRef = useRef<number>(0);

  const { viewMode, setViewMode, toggleViewMode, columns } = useViewMode();
  const thumbnails = useThumbnails(files);

  useEffect(() => {
    async function loadSavedSort() {
      try {
        const saved = await LocalStorage.getItem<string>(SEARCH_SORT_STORAGE_KEY);
        if (saved) {
          setSortBy(saved as SortOption);
        }
      } catch {
        // Fallback to name-asc
      }
    }
    loadSavedSort();
  }, []);

  const handleSortChange = async (newSort: SortOption) => {
    setSortBy(newSort);
    await LocalStorage.setItem(SEARCH_SORT_STORAGE_KEY, newSort);
  };

  const performSearch = async (query: string) => {
    const currentSearchId = ++searchIdRef.current;
    setIsLoading(true);
    try {
      const results = await searchPhotoshopProjects(query, prefs.searchScope || "home");
      if (currentSearchId === searchIdRef.current) {
        setFiles(results);
      }
    } catch {
      if (currentSearchId === searchIdRef.current) {
        setFiles([]);
      }
    } finally {
      if (currentSearchId === searchIdRef.current) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    performSearch(searchText);
  }, [searchText]);

  const handleRenamed = async (oldPath: string, newPath: string) => {
    const updatedFile = await createPhotoshopFile(newPath);
    setFiles((prev) => {
      const normalizedOld = path.resolve(oldPath);
      return prev.map((f) => {
        if (path.resolve(f.path) === normalizedOld) {
          return (
            updatedFile ?? {
              ...f,
              id: newPath,
              path: newPath,
              name: path.basename(newPath),
              title: path.basename(newPath, path.extname(newPath)),
              directory: path.dirname(newPath),
              directoryName: path.basename(path.dirname(newPath)),
            }
          );
        }
        return f;
      });
    });
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
        searchBarPlaceholder="Search Photoshop projects by name, folder, or layer..."
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
            onRenamed={(newPath) => handleRenamed(file.path, newPath)}
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
      searchBarPlaceholder="Search Photoshop projects by name, folder, or layer..."
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
          onRenamed={(newPath) => handleRenamed(file.path, newPath)}
        />
      ))}
    </List>
  );
}
