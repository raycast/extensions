import { useEffect, useCallback, useState, useRef } from "react";
import { List, Icon, Color, ActionPanel, Action, showToast, Toast, Alert, confirmAlert } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  listSchedules,
  listNamespaces,
  pauseSchedule,
  unpauseSchedule,
  triggerSchedule,
  deleteSchedule,
  showConnectionError,
  getCurrentNamespace,
  setCurrentCluster,
  setCurrentNamespace,
  getClusters,
} from "./lib/temporal-client";
import { ScheduleInfo, NamespaceInfo, ClusterConfig } from "./lib/types";
import { formatRelativeTime, formatDateTime } from "./lib/utils";
import ScheduleDetails from "./components/schedule-details";
import { getSelectedCluster, setSelectedCluster, getSelectedNamespace, setSelectedNamespace } from "./lib/storage";

export default function Schedules() {
  const [selectedClusterName, setSelectedClusterName] = useState<string>("");
  const [selectedNamespaceState, setSelectedNamespaceState] = useState<string>("");
  const isInitializedRef = useRef(false);

  // Load clusters from storage
  const { data: clusters = [], isLoading: clustersLoading } = useCachedPromise(getClusters, [], {
    keepPreviousData: true,
  });

  // Initialize cluster and namespace from storage (only once)
  useEffect(() => {
    if (clusters.length === 0 || isInitializedRef.current) return;
    isInitializedRef.current = true;

    async function init() {
      const storedCluster = await getSelectedCluster();
      const clusterName =
        storedCluster && clusters.find((c) => c.name === storedCluster) ? storedCluster : clusters[0]?.name || "Local";

      const cluster = clusters.find((c) => c.name === clusterName) || clusters[0];
      setSelectedClusterName(clusterName);
      setCurrentCluster(cluster);

      const storedNamespace = await getSelectedNamespace();
      const ns = storedNamespace || cluster?.namespace || "default";
      setSelectedNamespaceState(ns);
      setCurrentNamespace(ns);
    }
    init();
  }, [clusters]);

  // Fetch namespaces for selected cluster
  const {
    data: namespaces,
    isLoading: namespacesLoading,
    revalidate: revalidateNamespaces,
  } = useCachedPromise(
    async (clusterName: string) => {
      if (!clusterName) return [];
      try {
        return await listNamespaces();
      } catch {
        const cluster = clusters.find((c) => c.name === clusterName);
        return [{ name: cluster?.namespace || "default", state: "Registered" }] as NamespaceInfo[];
      }
    },
    [selectedClusterName],
    { keepPreviousData: true }
  );

  // Handle cluster change
  const handleClusterChange = useCallback(
    async (clusterName: string) => {
      const cluster = clusters.find((c) => c.name === clusterName);
      if (!cluster) return;

      setSelectedClusterName(clusterName);
      setCurrentCluster(cluster);
      await setSelectedCluster(clusterName);

      const ns = cluster.namespace || "default";
      setSelectedNamespaceState(ns);
      setCurrentNamespace(ns);
      await setSelectedNamespace(ns);

      revalidateNamespaces();

      await showToast({
        style: Toast.Style.Success,
        title: "Cluster Changed",
        message: `${clusterName} / ${ns}`,
      });
    },
    [clusters, revalidateNamespaces]
  );

  // Handle namespace change
  const handleNamespaceChange = useCallback(async (namespace: string) => {
    setSelectedNamespaceState(namespace);
    setCurrentNamespace(namespace);
    await setSelectedNamespace(namespace);
    await showToast({
      style: Toast.Style.Success,
      title: "Namespace Changed",
      message: namespace,
    });
  }, []);

  const {
    data: schedules,
    isLoading: schedulesLoading,
    error,
    revalidate,
  } = useCachedPromise(
    async (clusterName: string, namespace: string) => {
      if (!clusterName || !namespace) return [];
      return listSchedules();
    },
    [selectedClusterName, selectedNamespaceState],
    {
      keepPreviousData: true,
      onError: showConnectionError,
    }
  );

  // Periodic refresh
  useEffect(() => {
    const interval = setInterval(() => {
      revalidate();
    }, 30000);

    return () => clearInterval(interval);
  }, [revalidate]);

  const isLoading =
    clustersLoading || schedulesLoading || namespacesLoading || !selectedClusterName || !selectedNamespaceState;
  const namespace = getCurrentNamespace();

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Schedules"
      searchBarPlaceholder="Search schedules..."
      searchBarAccessory={
        <SchedulesDropdown
          clusters={clusters}
          selectedCluster={selectedClusterName}
          namespaces={namespaces || []}
          selectedNamespace={selectedNamespaceState}
          onClusterChange={handleClusterChange}
          onNamespaceChange={handleNamespaceChange}
        />
      }
    >
      {error && !schedules ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Connection Error"
          description="Could not connect to Temporal. Please check your settings."
        />
      ) : schedules?.length === 0 ? (
        <List.EmptyView
          icon={Icon.Calendar}
          title="No Schedules Found"
          description={`No schedules in namespace "${namespace}"`}
        />
      ) : (
        <>
          {/* Active Schedules */}
          <List.Section title="Active" subtitle={String(schedules?.filter((s) => !s.isPaused).length || 0)}>
            {schedules
              ?.filter((s) => !s.isPaused)
              .map((schedule) => (
                <ScheduleListItem key={schedule.scheduleId} schedule={schedule} onRefresh={revalidate} />
              ))}
          </List.Section>

          {/* Paused Schedules */}
          {schedules?.some((s) => s.isPaused) && (
            <List.Section title="Paused" subtitle={String(schedules?.filter((s) => s.isPaused).length || 0)}>
              {schedules
                ?.filter((s) => s.isPaused)
                .map((schedule) => (
                  <ScheduleListItem key={schedule.scheduleId} schedule={schedule} onRefresh={revalidate} />
                ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}

interface ScheduleListItemProps {
  schedule: ScheduleInfo;
  onRefresh: () => void;
}

function ScheduleListItem({ schedule, onRefresh }: ScheduleListItemProps) {
  const icon = schedule.isPaused ? Icon.Pause : Icon.Play;
  const color = schedule.isPaused ? Color.Orange : Color.Green;

  const nextRun = schedule.nextActionTimes[0];
  const nextRunText = nextRun ? formatRelativeTime(nextRun) : "No upcoming runs";

  return (
    <List.Item
      title={schedule.scheduleId}
      subtitle={schedule.workflowType || undefined}
      icon={{ source: icon, tintColor: color }}
      accessories={[
        { text: `${schedule.numActions} runs`, tooltip: `Total runs: ${schedule.numActions}` },
        {
          text: nextRunText,
          tooltip: nextRun ? `Next run: ${formatDateTime(nextRun)}` : "No upcoming runs",
        },
        {
          tag: { value: schedule.isPaused ? "Paused" : "Active", color },
        },
      ]}
      actions={<ScheduleActions schedule={schedule} onRefresh={onRefresh} />}
    />
  );
}

interface ScheduleActionsProps {
  schedule: ScheduleInfo;
  onRefresh: () => void;
}

// ============================================================================
// Dropdown
// ============================================================================

interface SchedulesDropdownProps {
  clusters: ClusterConfig[];
  selectedCluster: string;
  namespaces: NamespaceInfo[];
  selectedNamespace: string;
  onClusterChange: (clusterName: string) => void;
  onNamespaceChange: (namespace: string) => void;
}

function SchedulesDropdown({
  clusters,
  selectedCluster,
  namespaces,
  selectedNamespace,
  onClusterChange,
  onNamespaceChange,
}: SchedulesDropdownProps) {
  const combinedValue = `${selectedCluster}|${selectedNamespace}`;

  const handleChange = (value: string) => {
    const [cluster, ns] = value.split("|");
    if (cluster !== selectedCluster) {
      onClusterChange(cluster);
      return;
    }
    if (ns !== selectedNamespace) {
      onNamespaceChange(ns);
    }
  };

  const hasMultipleClusters = clusters.length > 1;

  if (hasMultipleClusters) {
    return (
      <List.Dropdown tooltip="Cluster / Namespace" value={combinedValue} onChange={handleChange}>
        {clusters.map((cluster) => (
          <List.Dropdown.Section key={cluster.name} title={`📍 ${cluster.name}`}>
            {cluster.name === selectedCluster ? (
              namespaces.map((ns) => (
                <List.Dropdown.Item
                  key={`${cluster.name}|${ns.name}`}
                  title={`  ${ns.name}`}
                  value={`${cluster.name}|${ns.name}`}
                />
              ))
            ) : (
              <List.Dropdown.Item
                key={`${cluster.name}|switch`}
                title="  Switch to this cluster..."
                value={`${cluster.name}|${cluster.namespace || "default"}`}
              />
            )}
          </List.Dropdown.Section>
        ))}
      </List.Dropdown>
    );
  }

  return (
    <List.Dropdown tooltip="Namespace" value={combinedValue} onChange={handleChange}>
      {namespaces.map((ns) => (
        <List.Dropdown.Item
          key={`${selectedCluster}|${ns.name}`}
          title={ns.name}
          value={`${selectedCluster}|${ns.name}`}
        />
      ))}
    </List.Dropdown>
  );
}

// ============================================================================
// Schedule Actions
// ============================================================================

function ScheduleActions({ schedule, onRefresh }: ScheduleActionsProps) {
  const handlePause = useCallback(async () => {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Pausing schedule..." });
      await pauseSchedule(schedule.scheduleId);
      await showToast({ style: Toast.Style.Success, title: "Schedule Paused" });
      onRefresh();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Pause",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }, [schedule.scheduleId, onRefresh]);

  const handleUnpause = useCallback(async () => {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Unpausing schedule..." });
      await unpauseSchedule(schedule.scheduleId);
      await showToast({ style: Toast.Style.Success, title: "Schedule Unpaused" });
      onRefresh();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Unpause",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }, [schedule.scheduleId, onRefresh]);

  const handleTrigger = useCallback(async () => {
    const confirmed = await confirmAlert({
      title: "Trigger Schedule Now",
      message: `Are you sure you want to trigger "${schedule.scheduleId}" immediately?`,
      primaryAction: { title: "Trigger Now" },
    });

    if (!confirmed) return;

    try {
      await showToast({ style: Toast.Style.Animated, title: "Triggering schedule..." });
      await triggerSchedule(schedule.scheduleId);
      await showToast({ style: Toast.Style.Success, title: "Schedule Triggered" });
      onRefresh();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Trigger",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }, [schedule.scheduleId, onRefresh]);

  const handleDelete = useCallback(async () => {
    const confirmed = await confirmAlert({
      title: "Delete Schedule",
      message: `Are you sure you want to delete "${schedule.scheduleId}"?\n\nThis action cannot be undone.`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });

    if (!confirmed) return;

    try {
      await showToast({ style: Toast.Style.Animated, title: "Deleting schedule..." });
      await deleteSchedule(schedule.scheduleId);
      await showToast({ style: Toast.Style.Success, title: "Schedule Deleted" });
      onRefresh();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Delete",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }, [schedule.scheduleId, onRefresh]);

  return (
    <ActionPanel>
      <ActionPanel.Section title="Schedule">
        <Action.Push
          title="View Details"
          icon={Icon.Eye}
          target={<ScheduleDetails scheduleId={schedule.scheduleId} />}
        />
        <Action.CopyToClipboard
          title="Copy Schedule Id"
          content={schedule.scheduleId}
          shortcut={{ modifiers: ["cmd"], key: "." }}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Actions">
        <Action
          title="Trigger Now"
          icon={Icon.Play}
          shortcut={{ modifiers: ["cmd"], key: "t" }}
          onAction={handleTrigger}
        />
        {schedule.isPaused ? (
          <Action
            title="Unpause"
            icon={Icon.Play}
            shortcut={{ modifiers: ["cmd"], key: "u" }}
            onAction={handleUnpause}
          />
        ) : (
          <Action title="Pause" icon={Icon.Pause} shortcut={{ modifiers: ["cmd"], key: "p" }} onAction={handlePause} />
        )}
      </ActionPanel.Section>

      <ActionPanel.Section title="Danger">
        <Action
          title="Delete Schedule"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
          onAction={handleDelete}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={onRefresh}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
