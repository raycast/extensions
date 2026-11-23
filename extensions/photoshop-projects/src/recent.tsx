import { Grid, List, LocalStorage } from "@raycast/api";
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

const RECENT_SORT_STORAGE_KEY = "photoshop_recent_sort_by";
const LOCATION_STORAGE_KEY = "photoshop_search_location";

export default function RecentProjectsCommand() {
  const [files, setFiles] = useState<PhotoshopFile[]>([]);
  const [searchText, setSearchText] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [selectedLocation, setSelectedLocation] = useState<string>("global");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const { viewMode, setViewMode, toggleViewMode, columns } = useViewMode();
  const thumbnails = useThumbnails(files);

  useEffect(() => {
    async function loadSavedPreferences() {
      try {
        const savedSort = await LocalStorage.getItem<string>(RECENT_SORT_STORAGE_KEY);
        if (savedSort) {
          setSortBy(savedSort as SortOption);
        }
        const savedLoc = await LocalStorage.getItem<string>(LOCATION_STORAGE_KEY);
        if (savedLoc) {
          setSelectedLocation(savedLoc);
        }
      } catch (error) {
        void error;
      }
    }
    loadSavedPreferences();
  }, []);

  const handleSortChange = async (newSort: SortOption) => {
    setSortBy(newSort);
    await LocalStorage.setItem(RECENT_SORT_STORAGE_KEY, newSort);
  };

  const handleLocationChange = async (newLoc: string) => {
    setSelectedLocation(newLoc);
    await LocalStorage.setItem(LOCATION_STORAGE_KEY, newLoc);
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
    let cancelled = false;
    setIsLoading(true);
    getRecentPhotoshopProjects(80)
      .then((recents) => {
        if (!cancelled) {
          setFiles(recents);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFiles([]);
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
  }, []);

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
    let filtered = files;
    if (selectedLocation && selectedLocation !== "global") {
      if (selectedLocation === "system") {
        filtered = filtered.filter((f) => !f.path.startsWith("/Volumes/"));
      } else {
        filtered = filtered.filter((f) => f.path.startsWith(selectedLocation));
      }
    }
    if (searchText.trim().length > 0) {
      const term = searchText.toLowerCase();
      filtered = filtered.filter(
        (f) =>
          f.name.toLowerCase().includes(term) ||
          f.directoryName.toLowerCase().includes(term) ||
          (f.layers && f.layers.some((l) => l.toLowerCase().includes(term))),
      );
    }
    return sortPhotoshopFiles(filtered, sortBy);
  }, [files, searchText, sortBy, selectedLocation]);

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
          onFileRenamed={handleFileRenamed}
        />
      ))}
    </List>
  );
}
