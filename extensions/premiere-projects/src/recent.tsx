import { Grid, List, LocalStorage } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import os from "node:os";
import { useEffect, useMemo, useState } from "react";
import { EmptyView } from "./components/EmptyView";
import { ProjectGridItem } from "./components/ProjectGridItem";
import { ProjectListItem } from "./components/ProjectListItem";
import { SortAndFilterDropdown } from "./components/SortAndFilterDropdown";
import { useThumbnails } from "./hooks/useThumbnails";
import { useViewMode } from "./hooks/useViewMode";
import { getRecentPremiereProjects } from "./services/recents";
import { filterPremiereFiles, sortPremiereFiles } from "./services/search";
import { PremiereFile, SortOption } from "./types";

const RECENT_SORT_STORAGE_KEY = "premiere_recent_sort_by";

export default function RecentProjectsCommand() {
  const [files, setFiles] = useState<PremiereFile[]>([]);
  const [searchText, setSearchText] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const { value: selectedLocation = "global", setValue: setSelectedLocation } = useLocalStorage<string>(
    "premiere_search_location",
    "global",
  );

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
        // Fallback to default
      }
    }
    loadSavedSort();
  }, []);

  const handleSortChange = async (newSort: SortOption) => {
    setSortBy(newSort);
    await LocalStorage.setItem(RECENT_SORT_STORAGE_KEY, newSort);
  };

  const handleLocationChange = (newLoc: string) => {
    setSelectedLocation(newLoc);
  };

  const loadRecents = async () => {
    setIsLoading(true);
    try {
      const recents = await getRecentPremiereProjects(80);
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

    getRecentPremiereProjects(80)
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

  const displayedFiles = useMemo(() => {
    let list = files;
    if (selectedLocation && selectedLocation !== "global") {
      if (selectedLocation === "system") {
        list = list.filter((f) => !f.path.startsWith("/Volumes/"));
      } else if (selectedLocation === "home") {
        const homeDir = os.homedir();
        list = list.filter((f) => f.path.startsWith(homeDir + "/") || f.path === homeDir);
      } else {
        const prefix = selectedLocation.endsWith("/") ? selectedLocation : selectedLocation + "/";
        list = list.filter((f) => f.path.startsWith(prefix) || f.path === selectedLocation);
      }
    }
    const filtered = filterPremiereFiles(list, searchText);
    return sortPremiereFiles(filtered, sortBy);
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
        searchBarPlaceholder="Filter recent Premiere Pro projects..."
        searchText={searchText}
        onSearchTextChange={setSearchText}
      >
        <EmptyView
          isGrid
          title="No Recent Premiere Pro Projects"
          description="Open a project in Premiere Pro (.prproj) or After Effects (.aep) to see it here."
        />
        {displayedFiles.map((file) => (
          <ProjectGridItem
            key={file.id}
            file={file}
            thumbnailPath={thumbnails[file.path]}
            viewMode={viewMode}
            onToggleViewMode={toggleViewMode}
            onRefresh={loadRecents}
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
      searchBarAccessory={accessory}
      searchBarPlaceholder="Filter recent Premiere Pro projects..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
    >
      <EmptyView
        isGrid={false}
        title="No Recent Premiere Pro Projects"
        description="Open a project in Premiere Pro (.prproj) or After Effects (.aep) to see it here."
      />
      {displayedFiles.map((file) => (
        <ProjectListItem
          key={file.id}
          file={file}
          thumbnailPath={thumbnails[file.path]}
          viewMode={viewMode}
          onToggleViewMode={toggleViewMode}
          onRefresh={loadRecents}
          onFileRenamed={handleFileRenamed}
          onFileDeleted={handleFileDeleted}
        />
      ))}
    </List>
  );
}
