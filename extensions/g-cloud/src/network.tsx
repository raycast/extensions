import { useState, useEffect } from "react";
import { List, Icon, getPreferenceValues, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { CacheManager } from "./utils/CacheManager";
import { initializeQuickLink } from "./utils/QuickLinks";
import NetworkView from "./services/network/NetworkView";
import { QuickProjectSwitcher } from "./utils/QuickProjectSwitcher";

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

  async function loadLastUsedProject() {
    const selectedProject = CacheManager.getSelectedProject();

    if (selectedProject && selectedProject.projectId) {
      const projectId = selectedProject.projectId;

      initializeQuickLink(projectId);

      viewNetworks(projectId);
      return;
    }

    const recentlyUsed = CacheManager.getRecentlyUsedProjects();

    if (recentlyUsed.length > 0) {
      const lastProjectId = recentlyUsed[0];

      initializeQuickLink(lastProjectId);

      viewNetworks(lastProjectId);
    } else {
      setError("No recent projects found. Please open the main extension first.");
      showFailureToast({
        title: "No recent projects",
        message: "Please open the main extension first",
      });
      setIsLoading(false);
    }
  }

  function viewNetworks(projectId: string) {
    push(<NetworkView projectId={projectId} gcloudPath={GCLOUD_PATH} />);
    setIsLoading(false);
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Loading Networks..."
      searchBarAccessory={
        <QuickProjectSwitcher
          gcloudPath={GCLOUD_PATH}
          onProjectSelect={(projectId) => {
            viewNetworks(projectId);
          }}
        />
      }
    >
      {error ? (
        <List.EmptyView icon={{ source: Icon.Warning, tintColor: "red" }} title="Error" description={error} />
      ) : (
        <List.EmptyView
          icon={{ source: Icon.Network }}
          title="Loading VPC Networks"
          description="Please wait while we load networks..."
        />
      )}
    </List>
  );
}
