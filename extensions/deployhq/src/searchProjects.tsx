import { useCachedPromise } from "@raycast/utils";
import { getPreferenceValues, List, Action, ActionPanel, showToast, Toast } from "@raycast/api";
import { Project } from "./lib/interfaces";
import { Logger } from "./utils/LoggerSingleton";
import ApiClient from "./services/ApiClient";
import { validateCredentials } from "./utils/validation";
import { useMemo } from "react";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();

  // Validate credentials
  const validation = validateCredentials(preferences);
  if (!validation.isValid) {
    showToast({
      style: Toast.Style.Failure,
      title: "Invalid Configuration",
      message: validation.errors.join(", "),
    });
    return (
      <List>
        <List.Item title="Configuration Error" subtitle={validation.errors.join(", ")} />
      </List>
    );
  }

  // Memoize API client creation to avoid recreating on every render
  const apiClient = useMemo(() => {
    return new ApiClient(
      `https://${preferences.deployHQAccountName}.deployhq.com`,
      preferences.deployHQAPIKey,
      preferences.deployHQUsername,
    );
  }, [preferences.deployHQAccountName, preferences.deployHQAPIKey, preferences.deployHQUsername]);

  const { data: projects, isLoading } = useCachedPromise(async () => {
    const result = await apiClient.call("/projects");
    const projectData = result.data;

    if (projectData.length === 0) {
      Logger.error("No projects found");
      return [];
    }

    return projectData;
  }, []);

  return (
    <List throttle={true} isLoading={isLoading}>
      {projects?.map((item) => (
        <List.Item
          key={item.identifier}
          title={item.name}
          accessories={[
            {
              text: item.last_deployed_at
                ? `Last Deployed: ${new Date(item.last_deployed_at).toLocaleDateString()}`
                : "Never Deployed",
            },
          ]}
          actions={projectActions(item, preferences)}
        />
      ))}
    </List>
  );
}

// Memoize project actions to prevent unnecessary re-renders
const projectActions = (item: Project, preferences: Preferences) => {
  const projectUrl = `https://${preferences.deployHQAccountName}.deployhq.com/projects/${item.permalink}`;

  return (
    <ActionPanel>
      <Action.OpenInBrowser title="Open Project in Browser" url={projectUrl} />
      {item.repository?.hosting_service?.tree_url && (
        <Action.OpenInBrowser title="Open Repository in Browser" url={item.repository.hosting_service.tree_url} />
      )}
    </ActionPanel>
  );
};
