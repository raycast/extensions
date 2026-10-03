import { Grid, List, LocalStorage } from "@raycast/api";
import path from "node:path";
import { useEffect, useMemo, useState } from "react";
import { EmptyView } from "./components/EmptyView";
import { ProjectGridItem } from "./components/ProjectGridItem";
import { ProjectListItem } from "./components/ProjectListItem";
import { SortAndFilterDropdown } from "./components/SortAndFilterDropdown";
import { useThumbnails } from "./hooks/useThumbnails";
import { useViewMode } from "./hooks/useViewMode";
import { getRecentPhotoshopProjects } from "./services/recents";
import { sortPhotoshopFiles } from "./services/search";
import { PhotoshopFile, SortOption } from "./types";
import { createPhotoshopFile } from "./utils/spotlight";

const RECENT_SORT_STORAGE_KEY = "photoshop_recent_sort_by";

export default function RecentProjectsCommand() {
  const [files, setFiles] = useState<PhotoshopFile[]>([]);
  const [searchText, setSearchText] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const { viewMode, setViewMode, toggleViewMode, columns } = useViewMode();
  const thumbnails = useThumbnails(files);

  useEffect(() => {
    async function loadSavedSort() {
      try {
        const saved = await LocalStorage.getItem<string>(RECENT_SORT_STORAGE_KEY);
        if (saved) {
          setSortBy(saved as SortOption);
        }
      } catch {
        // Fallback to recent
      }
    }
    loadSavedSort();
  }, []);

  const handleSortChange = async (newSort: SortOption) => {
    setSortBy(newSort);
    await LocalStorage.setItem(RECENT_SORT_STORAGE_KEY, newSort);
  };

  const loadRecents = async () => {
    setIsLoading(true);
    try {
      const recents = await getRecentPhotoshopProjects(80);
      setFiles(recents);
    } catch {
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRecents();
  }, []);

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
    let filtered = files;
    if (searchText.trim().length > 0) {
      const term = searchText.toLowerCase();
      filtered = files.filter(
        (f) =>
          f.name.toLowerCase().includes(term) ||
          f.directory.toLowerCase().includes(term) ||
          f.directoryName.toLowerCase().includes(term) ||
          (f.layers && f.layers.some((l) => l.toLowerCase().includes(term))),
      );
    }
    return sortPhotoshopFiles(filtered, sortBy);
  }, [files, searchText, sortBy]);

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
        searchBarPlaceholder="Filter recent Photoshop projects..."
        searchText={searchText}
        onSearchTextChange={setSearchText}
      >
        <EmptyView
          isGrid
          title="No Recent Photoshop Projects"
          description="Open a Photoshop document (.psd, .psb) in Adobe Photoshop or use Search Projects."
        />
        {sortedFiles.map((file) => (
          <ProjectGridItem
            key={file.id}
            file={file}
            thumbnailPath={thumbnails[file.path]}
            viewMode={viewMode}
            onToggleViewMode={toggleViewMode}
            onRefresh={loadRecents}
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
      searchBarPlaceholder="Filter recent Photoshop projects..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
    >
      <EmptyView
        title="No Recent Photoshop Projects"
        description="Open a Photoshop document (.psd, .psb) in Adobe Photoshop or use Search Projects."
      />
      {sortedFiles.map((file) => (
        <ProjectListItem
          key={file.id}
          file={file}
          thumbnailPath={thumbnails[file.path]}
          viewMode={viewMode}
          onToggleViewMode={toggleViewMode}
          onRefresh={loadRecents}
          onRenamed={(newPath) => handleRenamed(file.path, newPath)}
        />
      ))}
    </List>
  );
}
