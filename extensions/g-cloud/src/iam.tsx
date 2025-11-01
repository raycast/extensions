import { useState, useEffect } from "react";
import { List, Icon, getPreferenceValues, showToast, Toast, useNavigation } from "@raycast/api";
import { CacheManager } from "./utils/CacheManager";
import { initializeQuickLink } from "./utils/QuickLinks";
import IAMView from "./services/iam/IAMView";

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
    // First check for a selected project in the cache
    const selectedProject = CacheManager.getSelectedProject();

    if (selectedProject && selectedProject.projectId) {
      // Use the selected project
      const projectId = selectedProject.projectId;

      // Mark project as used in the quick link
      initializeQuickLink(projectId);

      // Navigate directly to IAM for this project
      viewIAMPermissions(projectId);
      return;
    }

    // Fall back to recently used projects if no selected project found
    const recentlyUsed = CacheManager.getRecentlyUsedProjects();

    if (recentlyUsed.length > 0) {
      // Use the most recently used project
      const lastProjectId = recentlyUsed[0];

      // Mark project as used in the quick link
      initializeQuickLink(lastProjectId);

      // Navigate directly to IAM for this project
      viewIAMPermissions(lastProjectId);
    } else {
      // If no recent projects, show error
      setError("No recent projects found. Please open the main extension first.");
      showToast({
        style: Toast.Style.Failure,
        title: "No recent projects",
        message: "Please open the main extension first",
      });
      setIsLoading(false);
    }
  }

  function viewIAMPermissions(projectId: string) {
    // Navigate to the IAM view component
    push(<IAMView projectId={projectId} gcloudPath={GCLOUD_PATH} />);
    setIsLoading(false);
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Loading IAM...">
      {error ? (
        <List.EmptyView icon={{ source: Icon.Warning, tintColor: "red" }} title="Error" description={error} />
      ) : (
        <List.EmptyView
          icon={{ source: Icon.PersonCircle }}
          title="Loading IAM Permissions"
          description="Please wait while we load IAM permissions..."
        />
      )}
    </List>
  );
}
