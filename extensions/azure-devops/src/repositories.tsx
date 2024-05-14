import { GitRepository } from "azure-devops-node-api/interfaces/GitInterfaces";
import { useEffect, useState } from "react";
import AzureDevOpsApiClient from "./api/client";
import { Action, ActionPanel, Icon, List, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { TeamProject } from "azure-devops-node-api/interfaces/CoreInterfaces";
import ProjectDropdown from "./components/ProjectsDropdown";
import RepositoryDetails from "./components/RepositoryDetails";
import PullRequestsList from "./components/PullRequestsList";

interface State {
  repositories?: GitRepository[];
  error?: Error;
}

export default function Command() {
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
          error: error instanceof Error ? error : new Error("An error occurred while fetching repositories."),
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadProjects();
  }, []);

  useEffect(() => {
    async function loadRepositories() {
      try {
        setIsLoading(true);
        setState({ repositories: await client.getProjectRepositories(selectedProject?.id) });
      } catch (error) {
        setState({
          error: error instanceof Error ? error : new Error("An error occurred while fetching repositories."),
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadRepositories();
  }, [selectedProject]);

  useEffect(() => {
    if (state.error) {
      showToast({ style: Toast.Style.Failure, title: "Error: ", message: state.error.message });
    }
  }, [state.error]);

  const onProjectChange = async (projectName: string) => {
    setSelectedProject(projects?.find((project) => project.name === projectName));
  };

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Listing Repositories"
      searchBarAccessory={<ProjectDropdown projects={projects} onProjectChange={onProjectChange} />}
    >
      {state.error && <List.Item title="An error ocurred, please try again later" />}
      {state.repositories?.map((repository: GitRepository) => (
        <List.Item
          key={repository.id}
          icon="azure-repo-icon.png"
          title={repository.name!}
          subtitle={repository.parentRepository?.name}
          keywords={[repository.id!]}
          accessories={[{ text: repository.defaultBranch }, { text: repository.project?.name }]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.OpenInBrowser url={repository.webUrl!} />
                <Action.Push
                  title="Show Details"
                  target={<RepositoryDetails repository={repository} />}
                  icon={Icon.Eye}
                />
                <Action.Push
                  title="Pull Requests"
                  icon={Icon.List}
                  target={<PullRequestsList repositotyId={repository.id} />}
                />
                <Action.CopyToClipboard title="Copy HTTPS URL" content={repository.remoteUrl!} />
                <Action.CopyToClipboard title="Copy SSH URL" content={repository.sshUrl!} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
