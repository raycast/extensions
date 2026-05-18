import { List, ActionPanel, Action, Icon, Color, Alert, confirmAlert, showToast, Toast, Detail } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { useState } from "react";
import { RunContainerForm } from "./components/RunContainerForm";
import { useDependencyCheck } from "./hooks/useDependencyCheck";
import { useDockerContainers } from "./hooks/useDockerContainers";
import { dockerStart, dockerStop, dockerRestart, dockerRm, CLI_ENV } from "./utils/cli";
import type { DockerContainer } from "./utils/types";

type StatusFilter = "all" | "running" | "exited" | "other";

function getStatusColor(state: string): Color {
  switch (state) {
    case "running":
      return Color.Green;
    case "exited":
      return Color.Red;
    case "created":
      return Color.Yellow;
    case "paused":
      return Color.Orange;
    default:
      return Color.SecondaryText;
  }
}

function truncateText(value: string, max = 40): string {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, max - 1)}...`;
}

function getFilteredContainers(containers: DockerContainer[], filter: StatusFilter): DockerContainer[] {
  switch (filter) {
    case "running":
      return containers.filter((container) => container.state === "running");
    case "exited":
      return containers.filter((container) => container.state === "exited");
    case "other":
      return containers.filter((container) => container.state !== "running" && container.state !== "exited");
    default:
      return containers;
  }
}

export default function Command() {
  const { colimaAvailable, dockerAvailable, isChecking } = useDependencyCheck({ colima: true, docker: true });
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const { data, isLoading, revalidate } = useDockerContainers();

  if (!isChecking && !colimaAvailable) {
    return (
      <List>
        <List.EmptyView
          title="Colima Not Found"
          description="Colima is not installed or not in your PATH. Install it with: brew install colima"
          icon={Icon.Warning}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Install Colima" url="https://colima.run/docs/installation/" />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (!isChecking && !dockerAvailable) {
    return (
      <List>
        <List.EmptyView
          title="Docker Not Available"
          description="Docker CLI is not found or Docker is not running. Start a Colima instance first."
          icon={Icon.Warning}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Colima Documentation" url="https://colima.run/docs/" />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const containers = getFilteredContainers(data ?? [], statusFilter);

  const handleStart = async (containerId: string) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Starting container..." });
    try {
      await dockerStart(containerId);
      toast.style = Toast.Style.Success;
      toast.title = "Container started";
      await revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to start container";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    }
  };

  const handleStop = async (containerId: string) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Stopping container..." });
    try {
      await dockerStop(containerId);
      toast.style = Toast.Style.Success;
      toast.title = "Container stopped";
      await revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to stop container";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    }
  };

  const handleRestart = async (containerId: string) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Restarting container..." });
    try {
      await dockerRestart(containerId);
      toast.style = Toast.Style.Success;
      toast.title = "Container restarted";
      await revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to restart container";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    }
  };

  const handleRemove = async (containerId: string) => {
    const confirmed = await confirmAlert({
      title: "Remove container?",
      message: "This will remove the container.",
      primaryAction: {
        title: "Remove",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Removing container...",
    });

    try {
      const container = data?.find((c) => c.id === containerId);
      if (container?.state === "running") {
        toast.title = "Stopping container...";
        await dockerStop(containerId);
      }
      await dockerRm(containerId);
      toast.style = Toast.Style.Success;
      toast.title = "Container removed";
      await revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to remove container";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    }
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search containers..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by status"
          value={statusFilter}
          onChange={(value) => setStatusFilter(value as StatusFilter)}
        >
          <List.Dropdown.Item title="All" value="all" />
          <List.Dropdown.Item title="Running" value="running" />
          <List.Dropdown.Item title="Stopped" value="exited" />
          <List.Dropdown.Item title="Other" value="other" />
        </List.Dropdown>
      }
    >
      {containers.length === 0 ? (
        <List.EmptyView
          title="No Docker Containers"
          description="No containers found. Run a container to get started."
          icon={Icon.Box}
          actions={
            <ActionPanel>
              <Action.Push title="Run New Container" icon={Icon.Plus} target={<RunContainerForm />} />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={() => {
                  void revalidate();
                }}
              />
            </ActionPanel>
          }
        />
      ) : (
        containers.map((container) => {
          const displayName = container.names.trim() || container.id.slice(0, 12);
          const truncatedPorts = truncateText(container.ports, 48);
          const truncatedCreatedAt = truncateText(container.createdAt, 32);

          return (
            <List.Item
              key={container.id}
              id={container.id}
              title={displayName}
              subtitle={container.image}
              icon={Icon.Box}
              accessories={[
                {
                  tag: {
                    value: container.state,
                    color: getStatusColor(container.state),
                  },
                },
                ...(container.ports
                  ? [
                      {
                        text: truncatedPorts,
                        tooltip: container.ports,
                      },
                    ]
                  : []),
                {
                  text: truncatedCreatedAt,
                  tooltip: container.createdAt.length > 32 ? container.createdAt : undefined,
                },
              ]}
              keywords={[container.names, container.image, container.state]}
              actions={
                <ActionPanel>
                  {container.state !== "running" ? (
                    <Action title="Start" icon={Icon.Play} onAction={() => handleStart(container.id)} />
                  ) : null}
                  {container.state === "running" ? (
                    <Action title="Stop" icon={Icon.Stop} onAction={() => handleStop(container.id)} />
                  ) : null}
                  {container.state === "running" ? (
                    <Action title="Restart" icon={Icon.ArrowClockwise} onAction={() => handleRestart(container.id)} />
                  ) : null}
                  <Action
                    title="Remove"
                    icon={Icon.Trash}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
                    style={Action.Style.Destructive}
                    onAction={() => handleRemove(container.id)}
                  />
                  <Action.Push
                    title="View Logs"
                    icon={Icon.Terminal}
                    shortcut={{ modifiers: ["cmd"], key: "l" }}
                    target={<ContainerLogs containerId={container.id} containerName={displayName} />}
                  />
                  <Action.Push title="Run New Container" icon={Icon.Plus} target={<RunContainerForm />} />
                  <Action.CopyToClipboard title="Copy Container Id" icon={Icon.Clipboard} content={container.id} />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={revalidate}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}

function ContainerLogs({ containerId, containerName }: { containerId: string; containerName: string }) {
  const { data, isLoading, revalidate } = useExec("docker", ["logs", "--tail", "200", containerId], {
    env: CLI_ENV,
    initialData: "",
  });

  const logs = data ?? "";

  return (
    <Detail
      navigationTitle={`Logs: ${containerName}`}
      isLoading={isLoading}
      markdown={`\`\`\`\n${logs}\n\`\`\``}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Logs" content={logs} />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={revalidate}
          />
        </ActionPanel>
      }
    />
  );
}
