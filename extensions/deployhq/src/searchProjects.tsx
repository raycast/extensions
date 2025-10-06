import { useState } from "react";
import { useCachedPromise } from "@raycast/utils";
import { getPreferenceValues, List, Action, ActionPanel, environment } from "@raycast/api";
import { Project } from "./lib/interfaces";
import { Logger } from "./utils/LoggerSingleton";
import ApiClient from "./services/ApiClient";

const preferences = getPreferenceValues<Preferences>();
const apiClient = new ApiClient(
  "https://" + preferences.deployHQAccountName + ".deployhq.com",
  preferences.deployHQAPIKey,
  preferences.deployHQUsername,
  preferences.deployHQAccountName,
);

interface State {
  items?: Project[];
}

export default function Command() {
  const [state, setState] = useState<State>({});

  useCachedPromise(async () => {
    async function fetchProjects() {
      const result = await apiClient.call("/projects");
      const projectData = result.data as Project[];

      if (projectData.length === 0) {
        if (environment.isDevelopment) Logger.error("No projects found");
        return [];
      }

      setState({
        items: projectData,
      });
    }

    fetchProjects();
  }, []);

  return (
    <List throttle={true} isLoading={state.items === undefined}>
      {state.items?.map((item) => (
        <List.Item key={item.identifier} title={item.name} actions={projectActions(item)} />
      ))}
    </List>
  );
}

function projectActions(item: Project) {
  return (
    <ActionPanel>
      <Action.OpenInBrowser
        title="Open Project in Browser"
        url={"https://" + preferences.deployHQAccountName + ".deployhq.com/projects/" + item.permalink}
      />
      {item.repository?.hosting_service?.tree_url && (
        <Action.OpenInBrowser title="Open Repository in Browser" url={item.repository.hosting_service.tree_url} />
      )}
    </ActionPanel>
  );
}
