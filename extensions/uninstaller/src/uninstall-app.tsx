import { execSync } from "child_process";

import FileList from "./components/FileList";
import AppList from "./components/AppList";
import { useAppState } from "./hooks/use-app-state";
import { escapeShellPath } from "./utils/helpers";

// Main command component that handles the uninstallation flow
export default function Command() {
  // State management for the application list and related data
  const {
    isLoading,
    applications,
    currentView,
    setCurrentView,
    setRelatedFiles,
    setSelectedApp,
    selectedApp,
    relatedFiles,
    loadApplications,
  } = useAppState();

  if (currentView === "fileList" && selectedApp) {
    const allFiles = [selectedApp.path, ...relatedFiles];
    const totalSizeKB = execSync(`du -sk ${allFiles.map(escapeShellPath).join(" ")} | awk '{sum+=$1} END {print sum}'`)
      .toString()
      .trim();
    const totalSize = (parseInt(totalSizeKB) * 1024).toString();

    const fileListProps = {
      selectedApp,
      allFiles,
      loadApplications,
      totalSize,
      setCurrentView,
      setSelectedApp,
      setRelatedFiles,
    };

    return <FileList {...fileListProps} />;
  }

  const appsListProps = {
    isLoading,
    applications,
    setSelectedApp,
    setRelatedFiles,
    setCurrentView,
  };

  return <AppList {...appsListProps} />;
}
