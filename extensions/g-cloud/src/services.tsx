import { useState, useEffect } from "react";
import { List, Icon, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { CacheManager } from "./utils/CacheManager";
import { initializeQuickLink } from "./utils/QuickLinks";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLastUsedProject();
  }, []);

  async function loadLastUsedProject() {
    const recentlyUsed = CacheManager.getRecentlyUsedProjects();

    if (recentlyUsed.length > 0) {
      const lastProjectId = recentlyUsed[0];

      try {
        await initializeQuickLink(lastProjectId);
      } catch (error) {
        console.error("Failed to initialize quick link:", error);
        // Don't block the main flow, just show a warning toast
        showToast({
          style: Toast.Style.Failure,
          title: "Warning: Quick Link Initialization Failed",
          message: "Some features may be limited",
        });
      }

      viewServices(lastProjectId);
    } else {
      setError("No recent projects found. Please open the main extension first.");
      showFailureToast({
        title: "No recent projects",
        message: "Please open the main extension first",
      });
      setIsLoading(false);
    }
  }

  function viewServices(projectId: string) {
    showToast({
      style: Toast.Style.Success,
      title: "Service Management",
      message: `Viewing services for project ${projectId}`,
    });

    setIsLoading(false);
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Loading Services...">
      {error ? (
        <List.EmptyView icon={{ source: Icon.Warning, tintColor: "red" }} title="Error" description={error} />
      ) : (
        <List.EmptyView
          icon={{ source: Icon.Cog }}
          title="Loading Services"
          description="Please wait while we load services..."
        />
      )}
    </List>
  );
}
