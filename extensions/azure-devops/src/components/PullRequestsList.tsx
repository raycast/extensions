import { getPreferenceValues, showToast, Toast, List, ActionPanel, Action, Icon } from "@raycast/api";
import { TeamProject } from "azure-devops-node-api/interfaces/CoreInterfaces";
import { GitPullRequest } from "azure-devops-node-api/interfaces/GitInterfaces";
import { useState, useEffect } from "react";
import AzureDevOpsApiClient from "../api/client";
import ProjectDropdown from "./ProjectsDropdown";
import PullRequestDetails from "./PullRequestDetails";

interface State {
  pullRequests?: GitPullRequest[];
  error?: Error;
}

export default function PullRequestList(props: { repositotyId?: string }) {
  const { repositotyId } = props;
  const [state, setState] = useState<State>({});
  const [isLoading, setIsLoading] = useState(true);
  const [projects, setProjects] = useState<TeamProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<TeamProject>();

  const { orgUrl, token } = getPreferenceValues<Preferences>();
  const client = new AzureDevOpsApiClient(orgUrl, token);

  useEffect(() => {
    async function loadProjects() {
      try {
        setIsLoading(true);
        setProjects(await client.getTeamProjects());
      } catch (error) {
        setState({
          error: error instanceof Error ? error : new Error("An error occurred while fetching pull requests."),
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadProjects();
  }, []);

  useEffect(() => {
    async function loadPullRequests() {
      try {
        setIsLoading(true);
        setState({ pullRequests: await client.getProjectPullRequests(selectedProject?.id, repositotyId) });
      } catch (error) {
        setState({
          error: error instanceof Error ? error : new Error("An error occurred while fetching pull requests."),
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadPullRequests();
  }, [selectedProject]);

  useEffect(() => {
    if (state.error) {
      showToast({ style: Toast.Style.Failure, title: "Error: ", message: state.error.message });
    }
  }, [state.error]);

  const onProjectChange = async (projectName: string) => {
    setSelectedProject(projects?.find((project) => project.name === projectName));
  };

  const pullRequestUrl = (pr: GitPullRequest): string => {
    return `${orgUrl}/${selectedProject?.name}/_git/${pr.repository?.name}/pullrequest/${pr.pullRequestId}`;
  };

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Listing Pull Requests"
      searchBarAccessory={<ProjectDropdown projects={projects} onProjectChange={onProjectChange} />}
    >
      {state.error && <List.Item title="An error ocurred, please try again later" />}
      {state.pullRequests?.map((pr: GitPullRequest) => (
        <List.Item
          icon="azure-pull-request.png"
          key={`${pr.repository?.name}-${pr.pullRequestId}`}
          title={pr.title!}
          accessories={[{ text: pr.repository?.name }, { text: pr.repository?.project?.name }]}
          keywords={[pr.repository?.name ?? ""]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.OpenInBrowser url={pullRequestUrl(pr)} />
                <Action.Push
                  title="Show Details"
                  icon={Icon.Info}
                  target={<PullRequestDetails pr={pr} webUrl={pullRequestUrl(pr)} />}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
