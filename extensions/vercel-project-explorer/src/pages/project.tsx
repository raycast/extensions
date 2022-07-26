import { ActionPanel, Icon, List, useNavigation, Action } from "@raycast/api";
import { useEffect, useState } from "react";
import fromNow from "../utils/time";
import { Deployment, Project as ProjectType, Team } from "../types";
import { fetchDeploymentsForProject } from "../vercel";
import CopyToClipboardActionPanel from "./action-panels/copy-to-clipboard";
import EnvironmentVariables from "./lists/environment-variables-list";
import EditPreferences from "./forms/edit-preferences";
import DeploymentsList from "./lists/deployments-list";

type Props = {
  project: ProjectType;
  username?: string;
  team?: Team;
  updateProject: (projectId: string, project: Partial<ProjectType>, teamId?: string) => Promise<void>;
};

const Project = ({ project, team, updateProject }: Props) => {
  const { push } = useNavigation();
  const [latestDeployment, setLatestDeployment] = useState<Deployment | undefined | null>();

  useEffect(() => {
    fetchDeploymentsForProject(project, team?.id, 1).then((deployments) => {
      if (deployments.length) setLatestDeployment(deployments[0]);
      else setLatestDeployment(null);
    });
  }, []);

  return (
    <List navigationTitle={project.name} isLoading={latestDeployment === undefined}>
      <List.Section title={`Deployments`}>
        <List.Item
          title={`Visit Most Recent Deployment`}
          icon={Icon.Link}
          subtitle={latestDeployment?.createdAt ? fromNow(latestDeployment.createdAt, new Date()) : ""}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={`https://${latestDeployment?.url}`} />
            </ActionPanel>
          }
          accessories={[
            {
              text: latestDeployment?.state?.toLowerCase() || latestDeployment?.readyState?.toLowerCase(),
            },
          ]}
        />

        <List.Item
          title="Search Deployments..."
          icon={Icon.MagnifyingGlass}
          actions={
            <ActionPanel>
              <Action
                title="Search Deployments..."
                icon={{ source: Icon.MagnifyingGlass }}
                onAction={() => {
                  push(<DeploymentsList projectId={project.id} />);
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Settings">
        <List.Item
          title={`Change project name`}
          icon={Icon.Gear}
          actions={
            <ActionPanel>
              <Action
                title="Edit"
                onAction={() => push(<EditPreferences updateProject={updateProject} team={team} project={project} />)}
              />
            </ActionPanel>
          }
        />

        <List.Item
          title={`Environment Variables`}
          icon={Icon.List}
          subtitle={project.env?.length ? `${project.env.length} variables` : "No variables"}
          actions={
            <ActionPanel>
              <Action title="Edit" onAction={() => push(<EnvironmentVariables team={team} project={project} />)} />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title={`Project Information`}>
        <List.Item
          icon={Icon.Clipboard}
          title={`Project ID`}
          subtitle={project.id}
          id={project.id}
          actions={<CopyToClipboardActionPanel text={project.id} />}
        />
      </List.Section>
    </List>
  );
};

export default Project;
