import { Application, getApplications, List } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { RecentEmptyView } from "./components/RecentEmptyView";
import { RecentFileListItem } from "./components/RecentFileListItem";
import { useMyRecentFiles } from "./hooks/useMyRecentFiles";
import { findInstalledOfficeApps } from "./utils/display";

export default function MyRecentFiles() {
  const {
    isLoading,
    isAuthorized,
    isSupported,
    recentFiles,
    handleDelete,
    handleDownload,
    handleReveal,
    handleCreateShareLink,
  } = useMyRecentFiles();

  const [installedOfficeApps, setInstalledOfficeApps] = useState<Map<string, Application>>(new Map());
  const [searchText, setSearchText] = useState("");

  // Check which Office apps are installed
  useEffect(() => {
    const checkInstalledApps = async () => {
      const allApps = await getApplications();
      setInstalledOfficeApps(findInstalledOfficeApps(allApps));
    };
    checkInstalledApps();
  }, []);

  // Filter files based on search text
  const filteredFiles = useMemo(() => {
    if (!searchText.trim()) {
      return recentFiles;
    }

    const lowerSearch = searchText.toLowerCase();
    return recentFiles.filter((insight) => {
      const fileName = insight.resourceVisualization.title.toLowerCase();
      const containerName = insight.resourceVisualization.containerDisplayName.toLowerCase();
      return fileName.includes(lowerSearch) || containerName.includes(lowerSearch);
    });
  }, [recentFiles, searchText]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter recent files"
      isShowingDetail
      onSearchTextChange={setSearchText}
    >
      {!isLoading && isAuthorized && !isSupported ? (
        <RecentEmptyView />
      ) : (
        <List.Section title="Recent" subtitle={`${filteredFiles.length}`}>
          {filteredFiles.map((insight) => (
            <RecentFileListItem
              key={insight.id}
              insight={insight}
              installedOfficeApps={installedOfficeApps}
              onDelete={handleDelete}
              onDownload={handleDownload}
              onReveal={handleReveal}
              onCreateShareLink={handleCreateShareLink}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
