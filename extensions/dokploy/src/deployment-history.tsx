import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useToken } from "./instances";
import DeploymentLogs from "./deployment-logs";
import { parseTrpcJsonResponse, trpcMutate, trpcQueryUrl } from "./trpc";

export interface Deployment {
  deploymentId: string;
  title: string;
  description: string | null;
  status: "running" | "done" | "error" | "cancelled";
  createdAt: string;
  errorMessage: string | null;
  rollbackId: string | null;
}

/**
 * `deployment.all`/`deployment.allByCompose` don't document a guaranteed order - sort explicitly
 * rather than trust the response order for "most recent"/"latest" semantics.
 */
export function sortDeploymentsByRecency(deployments: Deployment[]): Deployment[] {
  return [...deployments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export const STATUS_COLORS: Record<Deployment["status"], Color> = {
  running: Color.Yellow,
  done: Color.Green,
  error: Color.Red,
  cancelled: Color.SecondaryText,
};

// Only applications and compose stacks keep a deployment history; the six database kinds don't.
export type DeployableKind = "application" | "compose";
export const ID_FIELDS: Record<DeployableKind, string> = {
  application: "applicationId",
  compose: "composeId",
};
export const ENDPOINTS: Record<DeployableKind, string> = {
  application: "deployment.all",
  compose: "deployment.allByCompose",
};

export default function DeploymentHistory({
  service,
  token,
}: {
  service: { id: string; type: DeployableKind; name: string };
  /** Overrides the cached active-instance token - needed by callers (like Deployments) that list
   * services from more than one instance, where the service being viewed might not belong to
   * whichever instance happens to be currently active. */
  token?: { url: string; headers: Record<string, string> };
}) {
  const activeToken = useToken();
  const { url, headers } = token ?? activeToken;

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
                  target={<DeploymentLogs deployment={deployment} token={{ url, headers }} />}
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
