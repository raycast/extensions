import { Action, ActionPanel, Icon, List, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { RecentWorkItems } from "../utils/enums";
import { Project, WorkItem, WorkItemType } from "../utils/types";
import AzureDevOpsApiClient from "../api/client";
import ProjectDropdown from "./ProjectsDropdown";
import WorkItemDetails from "./WorkItemDetails";
import { toSnakeCase } from "../utils/helpers";

interface State {
  workItems?: WorkItem[];
  error?: Error;
}

export default function WorkItemList(props: { recentItems: RecentWorkItems }) {
  const { recentItems } = props;

  const [state, setState] = useState<State>({});
  const [isLoading, setIsLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project>();
  const [workItemTypes, setWorkItemTypes] = useState<WorkItemType[]>([]);

  const { orgUrl, token } = getPreferenceValues<Preferences>();
  const apiClient = new AzureDevOpsApiClient(orgUrl, token);

  // Fetch projects
  useEffect(() => {
    async function loadProjects() {
      try {
        setProjects(await apiClient.getProjects());
      } catch (error) {
        setState({
          error: error instanceof Error ? error : new Error("An error occurred while fetching projects."),
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadProjects();
  }, []);

  useEffect(() => {
    async function loadWorkItems() {
      if (selectedProject) {
        try {
          setIsLoading(true);
          setWorkItemTypes(await apiClient.getWorkItemTypes(selectedProject.id));
          setState({
            workItems:
              recentItems === RecentWorkItems.AssignedToMe
                ? await apiClient.getMyWorkItems(selectedProject.name)
                : await apiClient.getWorkItems(selectedProject.name),
          });
        } catch (error) {
          setState({ error: error instanceof Error ? error : new Error("An error occurred while fetching data.") });
        } finally {
          setIsLoading(false);
        }
      }
    }

    loadWorkItems();
  }, [selectedProject]);

  useEffect(() => {
    if (state.error) {
      showToast({ style: Toast.Style.Failure, title: "Error: ", message: state.error.message });
    }
  }, [state]);

  const onProjectChange = async (projectName: string) => {
    setSelectedProject(projects.find((project) => project.name === projectName));
  };

  const workItemIcon = (workItemType: string) => {
    const type = workItemTypes.find((type) => type.name === workItemType);
    return type?.icon.url ?? Icon.Document;
  };

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Listing working items"
      searchBarAccessory={<ProjectDropdown projects={projects} onProjectChange={onProjectChange} />}
    >
      {state.error && <List.Item title="An error occurred, please try again later." />}
      {state.workItems?.map((item) => (
        <List.Item
          key={item.id}
          icon={workItemIcon(item.workItemType)}
          title={item.title}
          subtitle={item.workItemType}
          keywords={[item.id.toString()]}
          accessories={[{ text: item.state }, { text: item.teamProject }]}
          actions={
            <ActionPanel title="Quick actions">
              <ActionPanel.Section>
                <Action.OpenInBrowser url={`${orgUrl}/${selectedProject?.id}/_workitems/edit/${item.id}`} />
                <Action.Push title="Item Details" target={<WorkItemDetails itemId={item.id} />} icon={Icon.Eye} />
                <Action.CopyToClipboard
                  title="Copy Branch Name"
                  shortcut={{ modifiers: ["cmd"], key: "." }}
                  content={`${item.id.toString()}_${toSnakeCase(item.title)}`}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
