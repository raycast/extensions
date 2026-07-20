/**
 * DeploymentSelector - Quick deployment selection dropdown
 *
 * In deploy key mode, this shows a static badge indicating the locked deployment.
 */

import { Icon, List } from "@raycast/api";
import {
  useTeams,
  useProjects,
  useDeployments,
  type Team,
  type Project,
  type Deployment,
} from "../hooks";
import { type DeployKeyConfig } from "../lib/deployKeyAuth";

interface DeploymentSelectorProps {
  accessToken: string;
  selectedTeamId: number | null;
  selectedProjectId: number | null;
  selectedDeploymentName: string | null;
  onSelect: (deployment: Deployment, project: Project, team: Team) => void;
  /** If provided, indicates deploy key mode - deployment switching is disabled */
  deployKeyConfig?: DeployKeyConfig | null;
}

export function DeploymentSelector({
  accessToken,
  selectedTeamId,
  selectedProjectId,
  selectedDeploymentName,
  onSelect,
  deployKeyConfig,
}: DeploymentSelectorProps) {
  // In deploy key mode, show a static dropdown with just the locked deployment
  if (deployKeyConfig) {
    return (
      <List.Dropdown
        tooltip="Deployment (Deploy Key Mode)"
        value={deployKeyConfig.deploymentName}
        onChange={() => {
          // No-op in deploy key mode
        }}
      >
        <List.Dropdown.Section title="Deploy Key Mode">
          <List.Dropdown.Item
            title={`${deployKeyConfig.deploymentName} (locked)`}
            value={deployKeyConfig.deploymentName}
            icon={Icon.Lock}
          />
        </List.Dropdown.Section>
      </List.Dropdown>
    );
  }

  const { data: teams, isLoading: teamsLoading } = useTeams(accessToken);
  const { data: projects, isLoading: projectsLoading } = useProjects(
    accessToken,
    selectedTeamId,
  );
  const { data: deployments, isLoading: deploymentsLoading } = useDeployments(
    accessToken,
    selectedProjectId,
  );

  const selectedTeam = teams?.find((t) => t.id === selectedTeamId);
  const selectedProject = projects?.find((p) => p.id === selectedProjectId);
  const selectedDeployment = deployments?.find(
    (d) => d.name === selectedDeploymentName,
  );

  const isLoading = teamsLoading || projectsLoading || deploymentsLoading;

  // Current selection display
  const currentSelection = selectedDeployment
    ? `${selectedTeam?.name ?? "..."} / ${selectedProject?.name ?? "..."} / ${selectedDeployment.deploymentType}`
    : "No deployment selected";

  return (
    <List.Dropdown
      tooltip="Select Deployment"
      value={selectedDeploymentName ?? ""}
      isLoading={isLoading}
      onChange={(value) => {
        // Find the deployment and its parent project/team
        if (!teams || !value) return;

        // We'd need to fetch all projects/deployments to find it
        // For now, assume the deployment is in the current selection
        if (deployments) {
          const deployment = deployments.find((d) => d.name === value);
          if (deployment && selectedProject && selectedTeam) {
            onSelect(deployment, selectedProject, selectedTeam);
          }
        }
      }}
    >
      <List.Dropdown.Section title={currentSelection}>
        {deployments?.map((deployment) => (
          <List.Dropdown.Item
            key={deployment.name}
            title={`${deployment.deploymentType} (${deployment.name})`}
            value={deployment.name}
            icon={deployment.deploymentType === "prod" ? Icon.Globe : Icon.Code}
          />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

/**
 * Deployment info subtitle for list items
 */
export function getDeploymentSubtitle(
  deployment: Deployment | null,
  project: Project | null,
  deployKeyConfig?: DeployKeyConfig | null,
): string {
  // Deploy key mode
  if (deployKeyConfig) {
    return `${deployKeyConfig.deploymentName} (deploy key)`;
  }

  if (!deployment || !project) return "No deployment selected";
  return `${project.name} / ${deployment.deploymentType}`;
}
