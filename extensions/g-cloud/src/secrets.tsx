import { useState, useEffect } from "react";
import { List, Icon, getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import SecretListView from "./services/secrets";
import { CacheManager } from "./utils/CacheManager";

interface ExtensionPreferences {
  gcloudPath: string;
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const GCLOUD_PATH = getPreferenceValues<ExtensionPreferences>().gcloudPath;

  useEffect(() => {
    loadLastUsedProject();
  }, []);

  function loadLastUsedProject() {
    const recentlyUsed = CacheManager.getRecentlyUsedProjects();
    if (recentlyUsed.length > 0) {
      setProjectId(recentlyUsed[0]);
    } else {
      setError("No recent projects found. Please open the main extension first.");
      showFailureToast({
        title: "No recent projects",
        message: "Please open the main extension first",
      });
    }
    setIsLoading(false);
  }

  function handleProjectChange(newProjectId: string) {
    setProjectId(newProjectId);
  }

  if (isLoading) {
    return <List isLoading={true} searchBarPlaceholder="Loading Secret Manager..." />;
  }

  if (error) {
    return (
      <List searchBarPlaceholder="Loading Secret Manager...">
        <List.EmptyView icon={{ source: Icon.Warning, tintColor: "red" }} title="Error" description={error} />
      </List>
    );
  }

  if (!projectId) {
    return (
      <List searchBarPlaceholder="Loading Secret Manager...">
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: "red" }}
          title="Error"
          description={"Project ID not found"}
        />
      </List>
    );
  }

  return <SecretListView projectId={projectId} gcloudPath={GCLOUD_PATH} onProjectChange={handleProjectChange} />;
}
