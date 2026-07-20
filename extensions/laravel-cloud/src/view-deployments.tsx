import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useAppEnvSelector } from "./components/app-env-selector";
import { listDeployments } from "./api/deployments";
import { Deployment } from "./types/deployment";
import { getDeploymentStatusIcon, getDeploymentStatusLabel } from "./utils/status-icons";
import { timeAgo } from "./utils/dates";
import DeploymentDetail from "./components/deployment-detail";

export default function ViewDeployments() {
  const { environmentId, isLoading: selectorLoading, Dropdown } = useAppEnvSelector();

  const { data, isLoading } = useCachedPromise(
    (envId: string) => listDeployments(envId, undefined, "initiator"),
    [environmentId],
    { execute: !!environmentId, keepPreviousData: true },
  );

  return (
    <List
      isLoading={selectorLoading || isLoading}
      searchBarPlaceholder="Search deployments..."
      searchBarAccessory={<Dropdown />}
    >
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
