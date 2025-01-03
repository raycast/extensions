import { Application, getApplications, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { log } from "../utils/helpers";

export function useAppState() {
  const [applications, setApplications] = useState<Application[]>([]); // List of installed apps
  const [isLoading, setIsLoading] = useState(true); // Loading state
  const [currentView, setCurrentView] = useState<"appList" | "fileList">("appList"); // Current view state
  const [selectedApp, setSelectedApp] = useState<Application | null>(null); // Currently selected app
  const [relatedFiles, setRelatedFiles] = useState<string[]>([]); // Files related to selected app

  // Effect hook to load applications when view changes
  useEffect(() => {
    if (currentView === "appList") {
      loadApplications();
    }
  }, [currentView]);

  // Loads installed applications from /Applications directory
  async function loadApplications() {
    try {
      const apps = await getApplications();
      setApplications(apps.filter((app) => app.path.startsWith("/Applications/")));
    } catch (error) {
      log("Failed to load applications:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load applications",
        message: "Could not retrieve list of installed applications. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return {
    applications,
    isLoading,
    currentView,
    selectedApp,
    relatedFiles,
    setCurrentView,
    setSelectedApp,
    setRelatedFiles,
    loadApplications,
  };
}
