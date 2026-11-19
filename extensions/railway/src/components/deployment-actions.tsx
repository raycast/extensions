import { ReactNode } from "react";
import { Action, ActionPanel, Alert, Icon, Keyboard, Toast, confirmAlert, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { DeploymentGQL, redeployDeployment, removeDeployment, restartDeployment } from "../railway";
import { isRunning } from "../utils";

interface RunDeploymentActionOptions {
  confirm: Alert.Options;
  progressTitle: string;
  successTitle: string;
  failureTitle: string;
  run: () => Promise<void>;
  onDone: () => void;
}

export async function runDeploymentAction(options: RunDeploymentActionOptions) {
  if (!(await confirmAlert(options.confirm))) return;

  const toast = await showToast({ style: Toast.Style.Animated, title: options.progressTitle });
  try {
    await options.run();
    toast.style = Toast.Style.Success;
    toast.title = options.successTitle;
    options.onDone();
  } catch (error) {
    await showFailureToast(error, { title: options.failureTitle });
  }
}

interface DeploymentActionsProps {
  deployment: DeploymentGQL | null;
  serviceName: string;
  environmentName: string;
  onChange: () => void;
  children?: ReactNode;
}

export function DeploymentActions({
  deployment,
  serviceName,
  environmentName,
  onChange,
  children,
}: DeploymentActionsProps) {
  const target = `${serviceName} in ${environmentName}`;

  return (
    <ActionPanel.Section title="Deployment">
      {deployment?.canRedeploy && (
        <Action
          title="Redeploy"
          icon={Icon.RotateClockwise}
          shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
          onAction={() =>
            runDeploymentAction({
              confirm: {
                title: `Redeploy ${serviceName}?`,
                message: `A new deployment of ${target} will be created from this deployment.`,
                primaryAction: { title: "Redeploy" },
              },
              progressTitle: `Redeploying ${serviceName}`,
              successTitle: `Redeployed ${serviceName}`,
              failureTitle: `Failed to redeploy ${serviceName}`,
              run: () => redeployDeployment(deployment.id),
              onDone: onChange,
            })
          }
        />
      )}
      {deployment && isRunning(deployment.status) && (
        <Action
          title="Restart"
          icon={Icon.Repeat}
          shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
          onAction={() =>
            runDeploymentAction({
              confirm: {
                title: `Restart ${serviceName}?`,
                message: `The running deployment of ${target} will be restarted without rebuilding.`,
                primaryAction: { title: "Restart" },
              },
              progressTitle: `Restarting ${serviceName}`,
              successTitle: `Restarted ${serviceName}`,
              failureTitle: `Failed to restart ${serviceName}`,
              run: () => restartDeployment(deployment.id),
              onDone: onChange,
            })
          }
        />
      )}
      {children}
      {deployment && isRunning(deployment.status) && (
        <Action
          title="Remove Deployment"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={Keyboard.Shortcut.Common.Remove}
          onAction={() =>
            runDeploymentAction({
              confirm: {
                title: `Remove deployment of ${serviceName}?`,
                message: `The deployment of ${target} will be stopped and removed.`,
                primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
              },
              progressTitle: `Removing deployment of ${serviceName}`,
              successTitle: `Removed deployment of ${serviceName}`,
              failureTitle: `Failed to remove deployment of ${serviceName}`,
              run: () => removeDeployment(deployment.id),
              onDone: onChange,
            })
          }
        />
      )}
    </ActionPanel.Section>
  );
}
