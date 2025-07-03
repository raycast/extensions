import { useState, useEffect } from "react";
import { List, Icon, getPreferenceValues, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { SecretListView } from "./services/secrets";
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

      viewSecrets(lastProjectId);
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

  function viewSecrets(projectId: string) {
    push(<SecretListView projectId={projectId} gcloudPath={GCLOUD_PATH} />);
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Loading Secret Manager...">
      {error ? (
        <List.EmptyView icon={{ source: Icon.Warning, tintColor: "red" }} title="Error" description={error} />
      ) : (
        <List.EmptyView
          icon={{ source: Icon.Lock }}
          title="Loading Secrets"
          description="Please wait while we load your secrets..."
        />
      )}
    </List>
  );
}
