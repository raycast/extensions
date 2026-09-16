import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useToken } from "./instances";
import DeploymentLogs from "./deployment-logs";
import { parseTrpcJsonResponse, trpcMutate, trpcQueryUrl } from "./trpc";

interface Deployment {
  deploymentId: string;
  title: string;
  description: string | null;
  status: "running" | "done" | "error" | "cancelled";
  createdAt: string;
  errorMessage: string | null;
  rollbackId: string | null;
}

const STATUS_COLORS: Record<Deployment["status"], Color> = {
  running: Color.Yellow,
  done: Color.Green,
  error: Color.Red,
  cancelled: Color.SecondaryText,
};

// Only applications and compose stacks keep a deployment history; the six database kinds don't.
type DeployableKind = "application" | "compose";
const ID_FIELDS: Record<DeployableKind, string> = {
  application: "applicationId",
  compose: "composeId",
};
const ENDPOINTS: Record<DeployableKind, string> = {
  application: "deployment.all",
  compose: "deployment.allByCompose",
};

export default function DeploymentHistory({
  service,
}: {
  service: { id: string; type: DeployableKind; name: string };
}) {
  const { url, headers } = useToken();

  const {
    isLoading,
    data: deployments,
    error,
    revalidate,
  } = useFetch<Deployment[], Deployment[]>(
    trpcQueryUrl(url, ENDPOINTS[service.type], { [ID_FIELDS[service.type]]: service.id }),
    {
      headers,
      parseResponse: (response) => parseTrpcJsonResponse<Deployment[]>(response),
      initialData: [],
    },
  );

  async function cancelDeployment(deployment: Deployment) {
    const options: Alert.Options = {
      title: `Cancel "${deployment.title}"?`,
      message: "This forcibly terminates the running deployment process.",
      primaryAction: {
        style: Alert.ActionStyle.Destructive,
        title: "Cancel Deployment",
      },
    };
    if (!(await confirmAlert(options))) return;

    const toast = await showToast(Toast.Style.Animated, "Cancelling", deployment.title);
    try {
      await trpcMutate(url, headers, "deployment.killProcess", { deploymentId: deployment.deploymentId });
      toast.style = Toast.Style.Success;
      toast.title = "Cancelled";
      revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not cancel";
      toast.message = `${error}`;
    }
  }

  async function rollbackDeployment(deployment: Deployment) {
    if (!deployment.rollbackId) return;

    const options: Alert.Options = {
      title: `Roll back to "${deployment.title}"?`,
      message: "This redeploys the version built by this deployment.",
      primaryAction: {
        style: Alert.ActionStyle.Destructive,
        title: "Roll Back",
      },
    };
    if (!(await confirmAlert(options))) return;

    const toast = await showToast(Toast.Style.Animated, "Rolling back", deployment.title);
    try {
      await trpcMutate(url, headers, "rollback.rollback", { rollbackId: deployment.rollbackId });
      toast.style = Toast.Style.Success;
      toast.title = "Rolled back";
      revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not roll back";
      toast.message = `${error}`;
    }
  }

  async function deleteDeployment(deployment: Deployment) {
    const options: Alert.Options = {
      title: "Delete this deployment record?",
      message: "This removes the history entry and its build logs, not anything it deployed.",
      primaryAction: {
        style: Alert.ActionStyle.Destructive,
        title: "Delete",
      },
    };
    if (!(await confirmAlert(options))) return;

    const toast = await showToast(Toast.Style.Animated, "Deleting", deployment.title);
    try {
      await trpcMutate(url, headers, "deployment.removeDeployment", { deploymentId: deployment.deploymentId });
      toast.style = Toast.Style.Success;
      toast.title = "Deleted";
      revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not delete";
      toast.message = `${error}`;
    }
  }

  return (
    <List navigationTitle={`${service.name} Deployments`} isLoading={isLoading}>
      {error ? (
        <List.EmptyView icon={Icon.ExclamationMark} title="Could not load deployments" description={`${error}`} />
      ) : (
        deployments.map((deployment) => (
          <List.Item
            key={deployment.deploymentId}
            icon={{ source: Icon.CircleFilled, tintColor: STATUS_COLORS[deployment.status] }}
            title={deployment.title}
            subtitle={deployment.errorMessage ?? deployment.description ?? undefined}
            accessories={[{ date: new Date(deployment.createdAt) }, { tag: deployment.status }]}
            actions={
              <ActionPanel>
                <Action.Push
                  icon={Icon.Terminal}
                  title="View Build Logs"
                  target={<DeploymentLogs deployment={deployment} />}
                />
                {deployment.rollbackId && (
                  <Action
                    icon={Icon.ArrowCounterClockwise}
                    title="Roll Back"
                    onAction={() => rollbackDeployment(deployment)}
                  />
                )}
                {deployment.status === "running" && (
                  <Action
                    icon={Icon.XmarkCircle}
                    title="Cancel"
                    style={Action.Style.Destructive}
                    onAction={() => cancelDeployment(deployment)}
                  />
                )}
                <Action
                  icon={Icon.Trash}
                  title="Delete"
                  style={Action.Style.Destructive}
                  onAction={() => deleteDeployment(deployment)}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
