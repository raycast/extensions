/**
 * Switch Deployment Command
 *
 * Quick switch between dev, prod, and preview deployments
 * for the current project without navigating through teams/projects.
 */

import {
  Action,
  ActionPanel,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useConvexAuth } from "./hooks/useConvexAuth";
import { useAuthenticatedListGuard } from "./components/AuthenticatedListGuard";
import {
  useDeployments,
  useTeams,
  useProjects,
  type Deployment,
} from "./hooks/useConvexData";

export default function SwitchDeploymentCommand() {
  const { session, selectedContext, setSelectedContext } = useConvexAuth();

  const accessToken = session?.accessToken ?? null;

  const { data: teams } = useTeams(accessToken);
  const { data: projects } = useProjects(accessToken, selectedContext.teamId);
  const { data: deployments, isLoading: deploymentsLoading } = useDeployments(
    accessToken,
    selectedContext.projectId,
  );

  const selectedTeam = teams?.find((t) => t.id === selectedContext.teamId);
  const selectedProject = projects?.find(
    (p) => p.id === selectedContext.projectId,
  );

  // Handle authentication
  const authGuard = useAuthenticatedListGuard(
    "Connect your Convex account to switch deployments",
  );
  if (authGuard) return authGuard;

  // No project selected
  if (!selectedContext.projectId) {
    return (
      <List>
        <List.EmptyView
          title="No Project Selected"
          description="Use 'Switch Project' to select a project first"
        />
      </List>
    );
  }

  // Handle deployment selection
  const handleSelectDeployment = async (deployment: Deployment) => {
    await setSelectedContext({ deploymentName: deployment.name });
    await showToast({
      style: Toast.Style.Success,
      title: "Deployment Selected",
      message: `${selectedProject?.name} / ${deployment.deploymentType}`,
    });
  };

  const contextSubtitle =
    selectedTeam && selectedProject
      ? `${selectedTeam.name} / ${selectedProject.name}`
      : "Current Project";

  return (
    <List
      isLoading={deploymentsLoading}
      navigationTitle="Switch Deployment"
      searchBarPlaceholder="Search deployments..."
    >
      <List.Section title={contextSubtitle}>
        {deployments?.map((deployment) => (
          <List.Item
            key={deployment.id}
            title={
              deployment.deploymentType === "prod"
                ? "Production"
                : deployment.deploymentType === "dev"
                  ? "Development"
                  : "Preview"
            }
            subtitle={deployment.name}
            accessories={[
              deployment.name === selectedContext.deploymentName
                ? { text: "Active", icon: Icon.Check }
                : {},
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Select Deployment"
                  icon={Icon.CheckCircle}
                  onAction={() => handleSelectDeployment(deployment)}
                />
                <Action.OpenInBrowser
                  title="Open in Dashboard"
                  url={`https://dashboard.convex.dev/t/${selectedTeam?.slug}/${selectedProject?.slug}/${deployment.deploymentType}`}
                />
                <Action.CopyToClipboard
                  title="Copy Deployment URL"
                  content={`https://${deployment.name}.convex.cloud`}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      {deployments?.length === 0 && !deploymentsLoading && (
        <List.EmptyView
          title="No Deployments Found"
          description={`No deployments for ${selectedProject?.name}`}
        />
      )}
    </List>
  );
}
