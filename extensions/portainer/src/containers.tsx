import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Detail,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { useContainers, portainerApi } from "./hooks/usePortainer";
import { Container, ContainerState } from "./api/types";
import {
  CONTAINER_STATE_COLORS,
  CONTAINER_STATE_ICONS,
  DEFAULT_ICONS,
} from "./utils/constants";
import {
  formatContainerName,
  formatPorts,
  formatShortId,
  formatRelativeTime,
  getPortainerWebUrl,
  isContainerRunning,
} from "./utils/helpers";

export default function ContainersCommand() {
  const { data: containers, isLoading, revalidate } = useContainers();
  const [selectedContainer, setSelectedContainer] = useState<Container | null>(
    null,
  );

  if (selectedContainer) {
    return (
      <ContainerLogsView
        container={selectedContainer}
        onBack={() => setSelectedContainer(null)}
      />
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search containers...">
      {containers?.map((container) => (
        <ContainerListItem
          key={container.Id}
          container={container}
          onShowLogs={() => setSelectedContainer(container)}
          revalidate={revalidate}
        />
      ))}
    </List>
  );
}

function ContainerListItem({
  container,
  onShowLogs,
  revalidate,
}: {
  container: Container;
  onShowLogs: () => void;
  revalidate: () => void;
}) {
  const name = formatContainerName(container);
  const state = container.State as ContainerState;
  const isRunning = isContainerRunning(container);

  const accessories: List.Item.Accessory[] = [
    {
      tag: {
        value: state,
        color: CONTAINER_STATE_COLORS[state] || Color.SecondaryText,
      },
    },
    {
      text: formatRelativeTime(container.Created),
    },
  ];

  const handleStart = async () => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Starting container...",
    });

    try {
      await portainerApi.startContainer(container.Id);
      toast.style = Toast.Style.Success;
      toast.title = "Container started";
      revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to start container";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    }
  };

  const handleStop = async () => {
    const confirmed = await confirmAlert({
      title: "Stop Container",
      message: `Are you sure you want to stop "${name}"?`,
      primaryAction: {
        title: "Stop",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Stopping container...",
    });

    try {
      await portainerApi.stopContainer(container.Id);
      toast.style = Toast.Style.Success;
      toast.title = "Container stopped";
      revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to stop container";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    }
  };

  const handleRestart = async () => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Restarting container...",
    });

    try {
      await portainerApi.restartContainer(container.Id);
      toast.style = Toast.Style.Success;
      toast.title = "Container restarted";
      revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to restart container";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    }
  };

  return (
    <List.Item
      title={name}
      subtitle={container.Image}
      icon={{
        source: CONTAINER_STATE_ICONS[state] || DEFAULT_ICONS.container,
        tintColor: CONTAINER_STATE_COLORS[state] || Color.SecondaryText,
      }}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {isRunning ? (
              <>
                <Action
                  title="Stop Container"
                  icon={Icon.Stop}
                  style={Action.Style.Destructive}
                  onAction={handleStop}
                />
                <Action
                  title="Restart Container"
                  icon={Icon.ArrowClockwise}
                  onAction={handleRestart}
                />
              </>
            ) : (
              <Action
                title="Start Container"
                icon={Icon.Play}
                onAction={handleStart}
              />
            )}
            <Action
              title="View Logs"
              icon={Icon.Terminal}
              onAction={onShowLogs}
              shortcut={{ modifiers: ["cmd"], key: "l" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Container Id"
              content={container.Id}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Container Name"
              content={name}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            <Action.OpenInBrowser
              title="Open in Portainer"
              url={getPortainerWebUrl(
                portainerApi.getPortainerUrl(),
                portainerApi.getEndpointIdSync(),
                "container",
                container.Id,
              )}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={revalidate}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function ContainerLogsView({
  container,
  onBack,
}: {
  container: Container;
  onBack: () => void;
}) {
  const [logs, setLogs] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);

  const fetchLogs = useCallback(
    async (showLoading = false) => {
      if (showLoading) setIsLoading(true);
      try {
        const logContent = await portainerApi.getContainerLogs(container.Id);
        setLogs(logContent);
      } catch (error) {
        setLogs(
          `Error fetching logs: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      } finally {
        if (showLoading) setIsLoading(false);
      }
    },
    [container.Id],
  );

  // Fetch logs on mount and set up auto-refresh
  useEffect(() => {
    fetchLogs(true);

    // Auto-refresh every 3 seconds
    const interval = setInterval(() => {
      if (isAutoRefresh) {
        fetchLogs(false);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [fetchLogs, isAutoRefresh]);

  const name = formatContainerName(container);

  const markdown = `# Logs: ${name}
${isAutoRefresh ? "_Auto-refreshing every 3 seconds_" : "_Auto-refresh paused_"}

\`\`\`
${logs || "No logs available"}
\`\`\`
`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={`Logs: ${name}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Container" text={name} />
          <Detail.Metadata.Label title="Image" text={container.Image} />
          <Detail.Metadata.Label
            title="ID"
            text={formatShortId(container.Id)}
          />
          <Detail.Metadata.Label title="Status" text={container.Status} />
          <Detail.Metadata.Label
            title="Ports"
            text={formatPorts(container.Ports)}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Auto-Refresh"
            text={isAutoRefresh ? "On (3s)" : "Off"}
            icon={isAutoRefresh ? Icon.Clock : Icon.XMarkCircle}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action
            title="Back to Containers"
            icon={Icon.ArrowLeft}
            onAction={onBack}
          />
          <Action
            title={isAutoRefresh ? "Pause Auto-refresh" : "Resume Auto-refresh"}
            icon={isAutoRefresh ? Icon.Pause : Icon.Play}
            onAction={() => setIsAutoRefresh(!isAutoRefresh)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
          />
          <Action
            title="Refresh Logs"
            icon={Icon.ArrowClockwise}
            onAction={() => fetchLogs(true)}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action.CopyToClipboard
            title="Copy Logs"
            content={logs}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
