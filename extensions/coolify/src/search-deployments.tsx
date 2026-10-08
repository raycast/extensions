import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import useDeploymentHistory from "./lib/use-deployment-history";
import { generateCoolifyUrl } from "./lib/utils";

const DEPLOYMENTS_PER_APPLICATION = 100;

export default function SearchDeployments() {
  const { isLoading, data: deployments = [] } = useDeploymentHistory(DEPLOYMENTS_PER_APPLICATION);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search deployments">
      <List.Section title="Recent Deployments" subtitle={`${deployments.length} deployments`}>
        {deployments.map((deployment) => (
          <List.Item
            key={deployment.deployment_uuid}
            icon={getDeploymentIcon(deployment.status)}
            title={deployment.application_name}
            subtitle={deployment.server_name}
            accessories={[
              { tag: { value: deployment.status, color: getDeploymentColor(deployment.status) } },
              { date: new Date(deployment.created_at), tooltip: `Started: ${deployment.created_at}` },
            ]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="Open Deployment"
                  icon="coolify.png"
                  url={generateCoolifyUrl(deployment.deployment_url).toString()}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function getDeploymentIcon(status: string) {
  return { source: Icon.Dot, tintColor: getDeploymentColor(status) };
}

function getDeploymentColor(status: string) {
  switch (status.toLowerCase()) {
    case "finished":
    case "success":
      return Color.Green;
    case "queued":
      return Color.SecondaryText;
    case "in_progress":
    case "running":
      return Color.Orange;
    case "failed":
    case "error":
    case "cancelled":
    case "cancelled-by-user":
      return Color.Red;
    default:
      return Color.PrimaryText;
  }
}
