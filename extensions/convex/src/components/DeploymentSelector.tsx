/**
 * DeploymentSelector - Quick deployment selection dropdown
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

interface DeploymentSelectorProps {
  accessToken: string;
  selectedTeamId: number | null;
  selectedProjectId: number | null;
  selectedDeploymentName: string | null;
  onSelect: (deployment: Deployment, project: Project, team: Team) => void;
}

export function DeploymentSelector({
  accessToken,
  selectedTeamId,
  selectedProjectId,
  selectedDeploymentName,
  onSelect,
}: DeploymentSelectorProps) {
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
): string {
  if (!deployment || !project) return "No deployment selected";
  return `${project.name} / ${deployment.deploymentType}`;
}
