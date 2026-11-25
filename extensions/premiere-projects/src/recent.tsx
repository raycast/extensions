import { Action, ActionPanel, getPreferenceValues, Grid, Icon, List, LocalStorage } from "@raycast/api";
import { useLocalStorage, usePromise } from "@raycast/utils";
import os from "node:os";
import path from "node:path";
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
  const prefs = getPreferenceValues<Preferences>();
  const defaultScope = prefs.searchScope === "all" ? "global" : "home";

  const [searchText, setSearchText] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortOption>("recent");

  const { value: selectedLocation = defaultScope, setValue: setSelectedLocation } = useLocalStorage<string>(
    "premiere_recent_location",
    defaultScope,
  );

  const {
    data: recentProjects,
    isLoading,
    error,
    revalidate,
  } = usePromise(async () => {
    return await getRecentPremiereProjects(80);
  }, []);

  const [files, setFiles] = useState<PremiereFile[]>([]);

  useEffect(() => {
    if (recentProjects) {
      setFiles(recentProjects);
    } else if (error) {
      setFiles([]);
    }
  }, [recentProjects, error]);

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
        if (process.platform === "win32") {
          const sysDrive = (process.env.SystemDrive || "C:").toUpperCase();
          list = list.filter((f) => f.path.toUpperCase().startsWith(sysDrive));
        } else {
          list = list.filter((f) => !f.path.startsWith("/Volumes/"));
        }
      } else if (selectedLocation === "home") {
        const homeDir = os.homedir();
        list = list.filter((f) => {
          const rel = path.relative(homeDir, f.path);
          return !rel.startsWith("..") && !path.isAbsolute(rel);
        });
      } else {
        list = list.filter((f) => {
          const rel = path.relative(selectedLocation, f.path);
          return !rel.startsWith("..") && !path.isAbsolute(rel);
        });
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

  const emptyView = error ? (
    <EmptyView
      isGrid={viewMode === "grid"}
      icon={Icon.Warning}
      title="Failed to Load Recent Projects"
      description={error.message || "An error occurred while loading recent projects."}
      actions={
        <ActionPanel>
          <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
        </ActionPanel>
      }
    />
  ) : (
    <EmptyView
      isGrid={viewMode === "grid"}
      title="No Recent Premiere Pro Projects"
      description="Open a project in Premiere Pro (.prproj) to see it here."
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
        {emptyView}
        {displayedFiles.map((file) => (
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
      searchBarPlaceholder="Filter recent Premiere Pro projects..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
    >
      {emptyView}
      {displayedFiles.map((file) => (
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
