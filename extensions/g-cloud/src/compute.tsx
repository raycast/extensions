import { useState, useEffect } from "react";
import { List, Icon, getPreferenceValues, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { ComputeInstancesView } from "./services/compute";
import { CacheManager } from "./utils/CacheManager";
import { initializeQuickLink } from "./utils/QuickLinks";

interface ExtensionPreferences {
  gcloudPath: string;
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { push } = useNavigation();
  const GCLOUD_PATH = getPreferenceValues<ExtensionPreferences>().gcloudPath;

  useEffect(() => {
    loadLastUsedProject();
  }, []);

  function loadLastUsedProject() {
    const recentlyUsed = CacheManager.getRecentlyUsedProjects();

    if (recentlyUsed.length > 0) {
      const lastProjectId = recentlyUsed[0];

      try {
        initializeQuickLink(lastProjectId);
      } catch (error) {
        console.error("Failed to initialize quick link:", error);
        showFailureToast({
          title: "Warning: Quick Link Initialization Failed",
          message: "Some features may be limited",
        });
      }

      viewComputeInstances(lastProjectId);
      setIsLoading(false);
    } else {
      setError("No recent projects found. Please open the main extension first.");
      showFailureToast({
        title: "No recent projects",
        message: "Please open the main extension first",
      });
      setIsLoading(false);
    }
  }

  function viewComputeInstances(projectId: string) {
    push(<ComputeInstancesView projectId={projectId} gcloudPath={GCLOUD_PATH} />);
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Loading Compute...">
      {error ? (
        <List.EmptyView icon={{ source: Icon.Warning, tintColor: "red" }} title="Error" description={error} />
      ) : (
        <List.EmptyView
          icon={{ source: Icon.Desktop }}
          title="Loading Compute Instances"
          description="Please wait while we load compute instances..."
        />
      )}
    </List>
  );
}
