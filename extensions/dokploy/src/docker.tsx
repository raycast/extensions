import { Action, ActionPanel, Alert, confirmAlert, Detail, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { useFetch, useFrecencySorting } from "@raycast/utils";
import { DockerContainer, ErrorResult } from "./interfaces";
import { type Instance, instanceId, useInstanceScope, tokenForInstance } from "./instances";
import DockerCleanup from "./docker-cleanup";

type ContainerAction = "restart" | "start" | "stop" | "kill" | "remove";

interface ContainerActionInfo {
  title: string;
  icon: Icon;
  route: string;
  progress: string;
  past: string;
  /** Dokploy version that added the route - only `restartContainer` predates v0.29.0. */
  since?: string;
}

const CONTAINER_ACTIONS: Record<ContainerAction, ContainerActionInfo> = {
  restart: {
    title: "Restart Container",
    icon: Icon.ArrowClockwise,
    route: "docker.restartContainer",
    progress: "Restarting",
    past: "Restarted",
  },
  start: {
    title: "Start Container",
    icon: Icon.Play,
    route: "docker.startContainer",
    progress: "Starting",
    past: "Started",
    since: "v0.29.0",
  },
  stop: {
    title: "Stop Container",
    icon: Icon.Stop,
    route: "docker.stopContainer",
    progress: "Stopping",
    past: "Stopped",
    since: "v0.29.0",
  },
  kill: {
    title: "Kill Container",
    icon: Icon.XMarkCircle,
    route: "docker.killContainer",
    progress: "Killing",
    past: "Killed",
    since: "v0.29.0",
  },
  remove: {
    title: "Remove Container",
    icon: Icon.Trash,
    route: "docker.removeContainer",
    progress: "Removing",
    past: "Removed",
    since: "v0.29.0",
  },
};

// Swarm names a service's task containers `<service>.<slot>.<task id>`; that's how Dokploy runs
// applications. `getContainers` returns no labels, so the name is the only signal available.
const SWARM_TASK_NAME = /^.+\.\d+\.[a-z0-9]{25}$/;

function confirmOptions(container: DockerContainer, action: ContainerAction): Alert.Options | null {
  const swarmNote = SWARM_TASK_NAME.test(container.name)
    ? " Docker Swarm manages this container and will start a replacement within seconds. To keep it down, stop its service instead."
    : "";
  const messages: Partial<Record<ContainerAction, string>> = {
    stop: `The container shuts down gracefully and stays stopped until it is started again.${swarmNote}`,
    kill: `The container is stopped immediately, without a graceful shutdown.${swarmNote}`,
    remove: `The container is deleted, and stopped first if it is running. Anything written inside it outside a volume is lost. Volumes are kept.${swarmNote}`,
  };
  const message = messages[action];
  if (!message) return null;
  return {
    title: `${CONTAINER_ACTIONS[action].title.replace(" Container", "")} ${container.name}?`,
    message,
    primaryAction: {
      style: Alert.ActionStyle.Destructive,
      title: CONTAINER_ACTIONS[action].title.replace(" Container", ""),
    },
  };
}

export default function Docker({ instance: initial }: { instance: Instance }) {
  const { url, headers, instance, dropdown } = useInstanceScope(initial);

  const {
    isLoading,
    data: containers,
    revalidate,
  } = useFetch<DockerContainer[], DockerContainer[]>(url + "docker.getContainers", {
    headers,
    initialData: [],
  });

  const { data: sortedContainers, visitItem } = useFrecencySorting(containers, {
    namespace: instanceId(instance),
    key: (container) => container.containerId,
  });

  async function runContainerAction(container: DockerContainer, action: ContainerAction) {
    const info = CONTAINER_ACTIONS[action];
    const options = confirmOptions(container, action);
    if (options && !(await confirmAlert(options))) return;

    const toast = await showToast(Toast.Style.Animated, info.progress, container.name);
    try {
      const response = await fetch(url + info.route, {
        method: "POST",
        headers,
        body: JSON.stringify({ containerId: container.containerId }),
      });
      if (!response.ok) {
        const err = (await response.json().catch(() => undefined)) as ErrorResult | undefined;
        const message = err?.message ?? `Request failed with status ${response.status}`;
        throw new Error(
          response.status === 404 && info.since ? `${message} (needs Dokploy ${info.since} or later)` : message,
        );
      }
      toast.style = Toast.Style.Success;
      toast.title = `${info.past} ${container.name}`;
      toast.message = undefined;
      revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `Could not ${action} container`;
      toast.message = `${error}`;
    }
  }

  function containerAction(container: DockerContainer, action: ContainerAction) {
    const info = CONTAINER_ACTIONS[action];
    return (
      <Action
        key={action}
        icon={info.icon}
        title={info.title}
        style={action === "remove" || action === "kill" ? Action.Style.Destructive : undefined}
        onAction={() => runContainerAction(container, action)}
      />
    );
  }

  const refreshAction = (
    <Action
      icon={Icon.ArrowClockwise}
      title="Refresh"
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={() => revalidate()}
    />
  );

  return (
    <List navigationTitle="Docker" isLoading={isLoading} searchBarAccessory={dropdown}>
      {/* Its own row, not attached to any container's own actions - disk usage/prune here targets
       * this instance's whole Dokploy host, not whichever container happens to be selected. */}
      <List.Item
        icon={Icon.Trash}
        title="Docker Cleanup"
        subtitle="Disk usage & prune for this server - not a single container"
        actions={
          <ActionPanel>
            <Action.Push icon={Icon.Trash} title="Docker Cleanup" target={<DockerCleanup instance={instance} />} />
            {/* Also here so the list can still be refreshed when it has no containers left. */}
            {refreshAction}
          </ActionPanel>
        }
      />
      {sortedContainers.map((container) => {
        // `docker ps` states: created, running, paused, restarting, removing, exited, dead.
        const isUp = container.state === "running" || container.state === "restarting";
        const isDown = container.state === "exited" || container.state === "created";
        return (
          <List.Item
            key={container.containerId}
            icon={Icon.Box}
            title={container.name}
            accessories={[{ tag: container.state }, { text: container.status }, { text: container.image }]}
            actions={
              <ActionPanel>
                <Action.Push
                  icon={Icon.WrenchScrewdriver}
                  title="View Config"
                  target={<DockerConfig container={container} instance={instance} />}
                  onPush={() => visitItem(container)}
                />
                <ActionPanel.Section>
                  {isUp && containerAction(container, "restart")}
                  {isDown && containerAction(container, "start")}
                  {isUp && containerAction(container, "stop")}
                  {isUp && containerAction(container, "kill")}
                </ActionPanel.Section>
                <ActionPanel.Section>{refreshAction}</ActionPanel.Section>
                <ActionPanel.Section>{containerAction(container, "remove")}</ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function DockerConfig({ container, instance }: { container: DockerContainer; instance: Instance }) {
  const { url, headers } = tokenForInstance(instance);
  const { isLoading, data } = useFetch(url + `docker.getConfig?containerId=${container.containerId}`, {
    headers,
  });

  return (
    <Detail
      navigationTitle="Docker"
      isLoading={isLoading}
      markdown={
        `${container.name} (${container.containerId})\n` +
        `\`\`\`json\n${JSON.stringify(data, null, 4) ?? "Loading..."}`
      }
    />
  );
}
