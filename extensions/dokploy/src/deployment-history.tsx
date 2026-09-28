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
  /** Only ever set on schedule runs - Dokploy never records one for application/compose builds. */
  pid?: string | null;
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

interface QueueJob {
  state?: string;
  data?: Record<string, unknown>;
}

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

  // `deployment.queueList` is the whole organization's in-memory deploy queue; only this service's
  // jobs that haven't started yet are what `cleanQueues` can remove.
  const {
    data: queuedCount,
    error: queueError,
    revalidate: revalidateQueue,
  } = useFetch<number | undefined, number | undefined>(trpcQueryUrl(url, "deployment.queueList", {}), {
    headers,
    parseResponse: async (response) => {
      const jobs = await parseTrpcJsonResponse<QueueJob[]>(response);
      return (jobs ?? []).filter((job) => job.state === "waiting" && job.data?.[ID_FIELDS[service.type]] === service.id)
        .length;
    },
    initialData: undefined,
  });

  function refresh() {
    revalidate();
    revalidateQueue();
  }

  // Unknown while loading (hidden); shown without a count if the queue couldn't be read at all.
  const showQueued = Boolean(queueError) || (queuedCount ?? 0) > 0;
  // Application/compose builds never carry a pid, so a running one is only stoppable via killBuild.
  const hasRunningBuild = deployments.some((deployment) => deployment.status === "running" && !deployment.pid);

  async function stopRunningBuilds() {
    const options: Alert.Options = {
      title: "Stop running builds?",
      message: `This stops every ${service.type === "compose" ? "Docker Compose" : "Docker"} build running on ${service.name}'s server, including other services' builds, not only this one. Those deployments end up marked as failed.`,
      primaryAction: {
        style: Alert.ActionStyle.Destructive,
        title: "Stop Builds",
      },
    };
    if (!(await confirmAlert(options))) return;

    const toast = await showToast(Toast.Style.Animated, "Stopping builds");
    try {
      const response = await fetch(`${url}${service.type}.killBuild`, {
        method: "POST",
        headers,
        body: JSON.stringify({ [ID_FIELDS[service.type]]: service.id }),
      });
      if (!response.ok) {
        const err = (await response.json().catch(() => undefined)) as { message?: string } | undefined;
        throw new Error(err?.message ?? `Request failed with status ${response.status}`);
      }
      toast.style = Toast.Style.Success;
      toast.title = "Stopped running builds";
      toast.message = "The deployment shows as failed once Dokploy notices the build ended.";
      refresh();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not stop builds";
      toast.message = `${error}`;
    }
  }

  async function cancelQueuedDeployments() {
    const options: Alert.Options = {
      title: `Cancel ${service.name}'s queued deployments?`,
      message:
        "Deployments waiting to start are removed from the queue. A build that's already running isn't affected.",
      primaryAction: {
        style: Alert.ActionStyle.Destructive,
        title: "Cancel Queued Deployments",
      },
    };
    if (!(await confirmAlert(options))) return;

    const toast = await showToast(Toast.Style.Animated, "Cancelling queued deployments");
    try {
      const response = await fetch(`${url}${service.type}.cleanQueues`, {
        method: "POST",
        headers,
        body: JSON.stringify({ [ID_FIELDS[service.type]]: service.id }),
      });
      if (!response.ok) {
        const err = (await response.json().catch(() => undefined)) as { message?: string } | undefined;
        throw new Error(err?.message ?? `Request failed with status ${response.status}`);
      }
      toast.style = Toast.Style.Success;
      toast.title = "Cancelled queued deployments";
      refresh();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not cancel queued deployments";
      toast.message = `${error}`;
    }
  }

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
      refresh();
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
                {/* Dokploy's own UI gates this the same way - `killProcess` needs a recorded pid,
                    which application/compose builds never have. Those use Stop Running Builds below. */}
                {deployment.status === "running" && deployment.pid && (
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
      {!error && (hasRunningBuild || showQueued) && (
        <List.Section title="Build Queue">
          {hasRunningBuild && (
            <List.Item
              icon={{ source: Icon.Stop, tintColor: Color.Red }}
              title="Stop Running Builds"
              subtitle="Every build on this service's server, not only this one"
              actions={
                <ActionPanel>
                  <Action
                    icon={Icon.Stop}
                    title="Stop Running Builds"
                    style={Action.Style.Destructive}
                    onAction={stopRunningBuilds}
                  />
                </ActionPanel>
              }
            />
          )}
          {showQueued && (
            <List.Item
              icon={{ source: Icon.Clock, tintColor: Color.Orange }}
              title="Cancel Queued Deployments"
              subtitle={queueError ? "Couldn't check the queue" : `${queuedCount} waiting to start`}
              actions={
                <ActionPanel>
                  <Action
                    icon={Icon.XmarkCircle}
                    title="Cancel Queued Deployments"
                    style={Action.Style.Destructive}
                    onAction={cancelQueuedDeployments}
                  />
                </ActionPanel>
              }
            />
          )}
        </List.Section>
      )}
    </List>
  );
}
