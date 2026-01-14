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
    <List throttle={true} isLoading={isLoading} isShowingDetail={true}>
      {projects?.map((item) => (
        <List.Item
          key={item.identifier}
          title={item.name}
          actions={projectActions(item, preferences)}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Link
                    title="Permalink"
                    target={`https://${preferences.deployHQAccountName}.deployhq.com/projects/${item.permalink}`}
                    text={`https://${preferences.deployHQAccountName}.deployhq.com/projects/${item.permalink}`}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Last Deployed"
                    text={
                      item.last_deployed_at
                        ? new Date(item.last_deployed_at).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "-"
                    }
                  />
                  <List.Item.Detail.Metadata.Label title="Zone" text={item.zone ?? "-"} />

                  {item.repository?.hosting_service && (
                    <>
                      <List.Item.Detail.Metadata.Separator></List.Item.Detail.Metadata.Separator>
                      <List.Item.Detail.Metadata.Label title="Repository" text={item.repository.hosting_service.name} />
                      <List.Item.Detail.Metadata.Link
                        title="Repository URL"
                        target={item.repository.hosting_service.tree_url}
                        text={item.repository.hosting_service.tree_url}
                      />
                      <List.Item.Detail.Metadata.Label title="Repository Branch" text={item.repository.branch} />
                    </>
                  )}
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      ))}
    </List>
  );
}

const projectActions = (item: Project, preferences: Preferences) => {
  const projectUrl = `https://${preferences.deployHQAccountName}.deployhq.com/projects/${item.permalink}`;
  const projectAction = <Action.OpenInBrowser title="Open Project in Browser" url={projectUrl} key="project-action" />;

  const repositoryUrl = item.repository?.hosting_service?.tree_url;
  const repositoryAction = repositoryUrl && (
    <Action.OpenInBrowser title="Open Repository in Browser" url={repositoryUrl} key="repository-action" />
  );

  const actions =
    preferences.defaultAction === "visit-project"
      ? [projectAction, repositoryAction].filter(Boolean)
      : [repositoryAction, projectAction].filter(Boolean);

  return <ActionPanel>{actions}</ActionPanel>;
};
