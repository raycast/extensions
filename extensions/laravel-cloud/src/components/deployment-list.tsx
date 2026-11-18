import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { listDeployments } from "../api/deployments";
import { Deployment } from "../types/deployment";
import { getDeploymentStatusIcon, getDeploymentStatusLabel } from "../utils/status-icons";
import { timeAgo } from "../utils/dates";
import DeploymentDetail from "./deployment-detail";

interface Props {
  environmentId: string;
  environmentName: string;
}

export default function DeploymentList({ environmentId, environmentName }: Props) {
  const { data, isLoading } = useCachedPromise(
    (envId: string) => listDeployments(envId, undefined, "initiator"),
    [environmentId],
  );

  return (
    <List isLoading={isLoading} navigationTitle={`${environmentName} — Deployments`}>
      {data?.data.map((deployment) => (
        <DeploymentListItem key={deployment.id} deployment={deployment} />
      ))}
    </List>
  );
}

function DeploymentListItem({ deployment }: { deployment: Deployment }) {
  const { attributes } = deployment;
  const statusIcon = getDeploymentStatusIcon(attributes.status);

  return (
    <List.Item
      icon={{ source: statusIcon.icon, tintColor: statusIcon.color }}
      title={attributes.commit_message || "No commit message"}
      subtitle={`${attributes.branch_name} @ ${attributes.commit_hash?.slice(0, 7)}`}
      accessories={[
        { tag: { value: getDeploymentStatusLabel(attributes.status), color: statusIcon.color } },
        { text: timeAgo(attributes.started_at || attributes.finished_at) },
      ]}
      actions={
        <ActionPanel>
          <Action.Push
            title="View Details"
            icon={Icon.Eye}
            target={<DeploymentDetail deploymentId={deployment.id} />}
          />
          <Action.CopyToClipboard
            title="Copy Commit Hash"
            content={attributes.commit_hash}
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
        </ActionPanel>
      }
    />
  );
}
