import { ActionPanel, Action, Detail, Icon, Color, Alert, confirmAlert, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getEnvironment, startEnvironment, stopEnvironment } from "../api/environments";
import { triggerDeployment } from "../api/deployments";
import { getEnvironmentStatusIcon } from "../utils/status-icons";
import { formatDate } from "../utils/dates";
import DeploymentList from "./deployment-list";
import DomainList from "./domain-list";
import InstanceList from "./instance-list";
import CommandList from "./command-list";
import LogList from "./log-list";
import EnvironmentVariables from "./environment-variables";

interface Props {
  environmentId: string;
  applicationName: string;
  environmentName: string;
}

export default function EnvironmentDetail({ environmentId, applicationName, environmentName }: Props) {
  const { data, isLoading, revalidate } = useCachedPromise(
    (envId: string) => getEnvironment(envId, "instances,currentDeployment"),
    [environmentId],
  );

  const env = data?.data;
  const attrs = env?.attributes;
  const statusIcon = attrs ? getEnvironmentStatusIcon(attrs.status) : null;

  const markdown = attrs
    ? `# ${environmentName}

| | |
|---|---|
| **Status** | ${attrs.status} |
| **PHP** | ${attrs.php_major_version} |
| **Node** | ${attrs.node_version} |
| **Octane** | ${attrs.uses_octane ? "Yes" : "No"} |
| **Hibernation** | ${attrs.uses_hibernation ? "Yes" : "No"} |
| **Push to Deploy** | ${attrs.uses_push_to_deploy ? "Yes" : "No"} |
| **Vanity Domain** | ${attrs.vanity_domain ?? "N/A"} |
| **Created** | ${formatDate(attrs.created_at)} |
`
    : "Loading...";

  async function handleDeploy() {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Triggering deployment..." });
      await triggerDeployment(environmentId);
      await showToast({ style: Toast.Style.Success, title: "Deployment triggered" });
      revalidate();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to trigger deployment", message: String(error) });
    }
  }

  async function handleStart() {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Starting environment..." });
      await startEnvironment(environmentId, true);
      await showToast({ style: Toast.Style.Success, title: "Environment started" });
      revalidate();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to start environment", message: String(error) });
    }
  }

  async function handleStop() {
    if (
      await confirmAlert({
        title: "Stop Environment",
        message: `Are you sure you want to stop "${environmentName}"?`,
        primaryAction: { title: "Stop", style: Alert.ActionStyle.Destructive },
      })
    ) {
      try {
        await showToast({ style: Toast.Style.Animated, title: "Stopping environment..." });
        await stopEnvironment(environmentId);
        await showToast({ style: Toast.Style.Success, title: "Environment stopped" });
        revalidate();
      } catch (error) {
        await showToast({ style: Toast.Style.Failure, title: "Failed to stop environment", message: String(error) });
      }
    }
  }

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`${applicationName} / ${environmentName}`}
      markdown={markdown}
      metadata={
        attrs ? (
          <Detail.Metadata>
            <Detail.Metadata.TagList title="Status">
              <Detail.Metadata.TagList.Item text={attrs.status} color={statusIcon?.color ?? Color.SecondaryText} />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Label title="PHP Version" text={attrs.php_major_version} />
            <Detail.Metadata.Label title="Node Version" text={attrs.node_version} />
            <Detail.Metadata.Label title="Vanity Domain" text={attrs.vanity_domain ?? "None"} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Build Command" text={attrs.build_command ?? "Default"} />
            <Detail.Metadata.Label title="Deploy Command" text={attrs.deploy_command ?? "Default"} />
            <Detail.Metadata.Label title="Octane" text={attrs.uses_octane ? "Enabled" : "Disabled"} />
            <Detail.Metadata.Label title="Hibernation" text={attrs.uses_hibernation ? "Enabled" : "Disabled"} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Created" text={formatDate(attrs.created_at)} />
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          <Action title="Deploy Now" icon={Icon.Upload} onAction={handleDeploy} />
          <Action.Push
            title="View Deployments"
            icon={Icon.Clock}
            target={<DeploymentList environmentId={environmentId} environmentName={environmentName} />}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
          />
          <Action.Push
            title="View Logs"
            icon={Icon.Terminal}
            target={<LogList environmentId={environmentId} environmentName={environmentName} />}
            shortcut={{ modifiers: ["cmd"], key: "l" }}
          />
          <Action.Push
            title="Run Command"
            icon={Icon.Terminal}
            target={<CommandList environmentId={environmentId} environmentName={environmentName} />}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action.Push
            title="Manage Domains"
            icon={Icon.Globe}
            target={<DomainList environmentId={environmentId} environmentName={environmentName} />}
            shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
          />
          <Action.Push
            title="Manage Environment Variables"
            icon={Icon.Key}
            target={<EnvironmentVariables environmentId={environmentId} environmentName={environmentName} />}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
          />
          <Action.Push
            title="View Instances"
            icon={Icon.ComputerChip}
            target={<InstanceList environmentId={environmentId} environmentName={environmentName} />}
            shortcut={{ modifiers: ["cmd"], key: "i" }}
          />
          {attrs?.status === "stopped" || attrs?.status === "hibernating" ? (
            <Action
              title="Start Environment"
              icon={Icon.Play}
              onAction={handleStart}
              style={Action.Style.Regular}
              shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
            />
          ) : (
            <Action
              title="Stop Environment"
              icon={Icon.Stop}
              onAction={handleStop}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
            />
          )}
          {attrs?.vanity_domain && (
            <Action.OpenInBrowser
              title="Open in Browser"
              url={`https://${attrs.vanity_domain}`}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
