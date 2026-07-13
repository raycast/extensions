import { Action, ActionPanel, Alert, confirmAlert, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { DokployClient } from "../api/client";
import {
  cancelDeployment,
  killDeployment,
  listDeployments,
  removeDeployment,
  rollbackToDeployment,
} from "../api/dokploy-api";
import { toErrorMessage } from "../api/errors";
import { deploymentHeadline, formatDeploymentSubtitle, fullDeploymentDescription } from "../lib/format";
import { deploymentIcon, deploymentTag } from "../lib/status";
import { serviceUrl } from "../lib/urls";
import { Deployment, ServiceRef } from "../types/dokploy";
import { DeploymentLogs } from "./deployment-logs";

interface DeploymentListProps {
  client: DokployClient;
  service: ServiceRef;
}

/** The build history of one application or compose stack. */
export function DeploymentList({ client, service }: DeploymentListProps) {
  const { data, isLoading, revalidate } = usePromise(
    async (ref: ServiceRef) => listDeployments(client, ref),
    [service],
    { failureToastOptions: { title: "Could Not Load Deployments" } },
  );

  const deployments = data ?? [];
  const hasRunning = deployments.some((deployment) => deployment.status === "running");

  async function run(label: string, task: () => Promise<unknown>, successTitle: string) {
    const toast = await showToast({ style: Toast.Style.Animated, title: label });
    try {
      await task();
      toast.style = Toast.Style.Success;
      toast.title = successTitle;
      revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `Could Not ${label}`;
      toast.message = toErrorMessage(error);
    }
  }

  async function confirmAndRollback(deployment: Deployment) {
    if (!deployment.rollbackId) return;
    const confirmed = await confirmAlert({
      title: `Roll back ${service.name}?`,
      message: `This restores the build from ${
        deployment.createdAt ? new Date(deployment.createdAt).toLocaleString() : "this deployment"
      }, replacing what is running now.`,
      icon: Icon.Undo,
      primaryAction: { title: "Roll Back", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await run("Rolling Back", () => rollbackToDeployment(client, deployment.rollbackId as string), "Rollback Started");
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`${service.name} - Deployments`}
      searchBarPlaceholder="Search deployments…"
    >
      <List.EmptyView
        icon={Icon.Rocket}
        title="No Deployments"
        description={`${service.name} has not been deployed yet.`}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open in Dokploy" url={serviceUrl(client.webUrl, service)} />
          </ActionPanel>
        }
      />

      {deployments.map((deployment) => {
        const status = deploymentTag(deployment.status);
        const isRunning = deployment.status === "running";

        return (
          <List.Item
            key={deployment.deploymentId}
            icon={deploymentIcon(deployment.status)}
            // The title is the whole commit message, body and all - keep the subject line only.
            title={deploymentHeadline(deployment.title, 80)}
            // Shortened to a 7-char sha: the full 40-char commit was pushing the status and date
            // off the right edge of the row. The full value lives in the tooltip and copy action.
            subtitle={{
              value: formatDeploymentSubtitle(deployment.description),
              tooltip: fullDeploymentDescription(deployment.description),
            }}
            accessories={[
              ...(deployment.errorMessage?.trim()
                ? [{ icon: Icon.ExclamationMark, tooltip: deployment.errorMessage.trim() }]
                : []),
              { tag: status },
              ...(deployment.createdAt ? [{ date: new Date(deployment.createdAt) }] : []),
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.Push
                    title="View Build Log"
                    icon={Icon.Terminal}
                    target={<DeploymentLogs client={client} deployment={deployment} serviceName={service.name} />}
                  />
                  <Action.OpenInBrowser
                    title="Open in Dokploy"
                    url={serviceUrl(client.webUrl, service)}
                    shortcut={Keyboard.Shortcut.Common.Open}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={revalidate}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section>
                  {isRunning && (
                    <Action
                      title="Kill Build"
                      icon={Icon.Stop}
                      style={Action.Style.Destructive}
                      onAction={() =>
                        run("Killing Build", () => killDeployment(client, deployment.deploymentId), "Build Killed")
                      }
                    />
                  )}
                  {hasRunning && (
                    <Action
                      title="Cancel Deployment"
                      icon={Icon.XMarkCircle}
                      onAction={() =>
                        run("Canceling Deployment", () => cancelDeployment(client, service), "Deployment Canceled")
                      }
                    />
                  )}
                  {/* Only deployments that produced a restore point carry a rollbackId. */}
                  {deployment.rollbackId && (
                    <Action
                      title="Roll Back to This Build"
                      icon={Icon.Undo}
                      onAction={() => confirmAndRollback(deployment)}
                    />
                  )}
                </ActionPanel.Section>

                <ActionPanel.Section>
                  <Action.CopyToClipboard
                    title="Copy Deployment ID"
                    content={deployment.deploymentId}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                  />
                  <Action
                    title="Delete Deployment"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    onAction={() =>
                      run(
                        "Deleting Deployment",
                        () => removeDeployment(client, deployment.deploymentId),
                        "Deployment Deleted",
                      )
                    }
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
