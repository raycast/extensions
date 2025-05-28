import { useState, useEffect } from "react";
import { List, Icon, getPreferenceValues, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { StorageBucketView } from "./services/storage";
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

  async function loadLastUsedProject() {
    const recentlyUsed = CacheManager.getRecentlyUsedProjects();

    if (recentlyUsed.length > 0) {
      const lastProjectId = recentlyUsed[0];

      initializeQuickLink(lastProjectId);

      viewStorageBuckets(lastProjectId);
    } else {
      setError("No recent projects found. Please open the main extension first.");
      showFailureToast({
        title: "No recent projects",
        message: "Please open the main extension first",
      });
      setIsLoading(false);
    }
  }

  function viewStorageBuckets(projectId: string) {
    push(<StorageBucketView projectId={projectId} gcloudPath={GCLOUD_PATH} />);
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Loading Storage...">
      {error ? (
        <List.EmptyView icon={{ source: Icon.Warning, tintColor: "red" }} title="Error" description={error} />
      ) : (
        <List.EmptyView
          icon={{ source: Icon.Box }}
          title="Loading Storage"
          description="Please wait while we load storage buckets..."
        />
      )}
    </List>
  );
}
