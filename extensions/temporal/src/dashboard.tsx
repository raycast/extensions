import { useEffect, useState, useCallback, useRef } from "react";
import { List, Icon, showToast, Toast, Color, ActionPanel, Action } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  countWorkflows,
  listNamespaces,
  showConnectionError,
  setCurrentNamespace,
  setCurrentCluster,
  getClusters,
} from "./lib/temporal-client";
import { NamespaceInfo, ClusterConfig } from "./lib/types";
import { getSelectedNamespace, setSelectedNamespace, getSelectedCluster, setSelectedCluster } from "./lib/storage";

interface WorkflowCounts {
  running: number;
  completed: number;
  failed: number;
  cancelled: number;
  terminated: number;
  timedOut: number;
  continuedAsNew: number;
}

const TIME_RANGES = [
  { value: "1h", title: "Last Hour" },
  { value: "24h", title: "Last 24 Hours" },
  { value: "7d", title: "Last 7 Days" },
  { value: "30d", title: "Last 30 Days" },
  { value: "all", title: "All Time" },
];

/**
 * Get the time query for a given time range
 * Temporal HTTP API requires actual ISO timestamps, not "now() - 1h" syntax
 */
function getTimeQuery(range: string): string {
  if (range === "all") return "";

  const now = new Date();
  let startTime: Date;

  switch (range) {
    case "1h":
      startTime = new Date(now.getTime() - 60 * 60 * 1000);
      break;
    case "24h":
      startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case "7d":
      startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "30d":
      startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      return "";
  }

  return `StartTime > "${startTime.toISOString()}"`;
}

export default function Dashboard() {
  const [selectedClusterName, setSelectedClusterName] = useState<string>("");
  const [selectedNamespace, setSelectedNamespaceState] = useState<string>("");
  const [timeRange, setTimeRange] = useState("24h");
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
  const { data: namespaces, isLoading: namespacesLoading } = useCachedPromise(
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
    (clusterName: string) => {
      try {
        const cluster = clusters.find((c) => c.name === clusterName);
        if (!cluster) return;

        const ns = cluster.namespace || "default";

        // Update React state
        setSelectedClusterName(clusterName);
        setSelectedNamespaceState(ns);

        // Set module-level state
        setCurrentCluster(cluster);
        setCurrentNamespace(ns);

        // Persist to storage (fire and forget)
        setSelectedCluster(clusterName);
        setSelectedNamespace(ns);

        showToast({
          style: Toast.Style.Success,
          title: "Cluster Changed",
          message: `${clusterName} / ${ns}`,
        });
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to switch cluster",
          message: String(error),
        });
      }
    },
    [clusters]
  );

  // Handle namespace change
  const handleNamespaceChange = useCallback((namespace: string) => {
    setSelectedNamespaceState(namespace);
    setCurrentNamespace(namespace);
    setSelectedNamespace(namespace);
    showToast({
      style: Toast.Style.Success,
      title: "Namespace Changed",
      message: namespace,
    });
  }, []);

  const timeRangeConfig = TIME_RANGES.find((t) => t.value === timeRange) || TIME_RANGES[1];

  // Fetch workflow counts
  const {
    data: counts,
    isLoading: countsLoading,
    revalidate,
  } = useCachedPromise(
    async (namespace: string, range: string, clusterName: string) => {
      if (!namespace || !clusterName) return null;

      // Compute the time query with actual ISO timestamp
      const timeQuery = getTimeQuery(range);

      const buildQuery = (status: string) => {
        const statusQuery = `ExecutionStatus = "${status}"`;
        return timeQuery ? `${statusQuery} AND ${timeQuery}` : statusQuery;
      };

      const [running, completed, failed, cancelled, terminated, timedOut, continuedAsNew] = await Promise.all([
        countWorkflows(buildQuery("Running")).catch(() => 0),
        countWorkflows(buildQuery("Completed")).catch(() => 0),
        countWorkflows(buildQuery("Failed")).catch(() => 0),
        countWorkflows(buildQuery("Canceled")).catch(() => 0),
        countWorkflows(buildQuery("Terminated")).catch(() => 0),
        countWorkflows(buildQuery("TimedOut")).catch(() => 0),
        countWorkflows(buildQuery("ContinuedAsNew")).catch(() => 0),
      ]);

      return {
        running,
        completed,
        failed,
        cancelled,
        terminated,
        timedOut,
        continuedAsNew,
      } as WorkflowCounts;
    },
    [selectedNamespace, timeRange, selectedClusterName],
    {
      keepPreviousData: true,
      onError: showConnectionError,
    }
  );

  // Periodic refresh (every 30 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      revalidate();
    }, 30000);
    return () => clearInterval(interval);
  }, [revalidate]);

  const isLoading = clustersLoading || countsLoading || namespacesLoading || !selectedNamespace || !selectedClusterName;
  const total = counts
    ? counts.running +
      counts.completed +
      counts.failed +
      counts.cancelled +
      counts.terminated +
      counts.timedOut +
      counts.continuedAsNew
    : 0;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Dashboard"
      searchBarAccessory={
        <DashboardDropdown
          clusters={clusters}
          selectedCluster={selectedClusterName}
          namespaces={namespaces || []}
          selectedNamespace={selectedNamespace}
          timeRange={timeRange}
          onClusterChange={handleClusterChange}
          onNamespaceChange={handleNamespaceChange}
          onTimeRangeChange={setTimeRange}
        />
      }
    >
      <List.Section title="Overview" subtitle={`${total} total workflows - ${timeRangeConfig.title}`}>
        <StatusItem
          title="Running"
          count={counts?.running || 0}
          icon={Icon.Play}
          color={Color.Blue}
          onRefresh={revalidate}
        />
        <StatusItem
          title="Completed"
          count={counts?.completed || 0}
          icon={Icon.CheckCircle}
          color={Color.Green}
          onRefresh={revalidate}
        />
        <StatusItem
          title="Failed"
          count={counts?.failed || 0}
          icon={Icon.XMarkCircle}
          color={Color.Red}
          onRefresh={revalidate}
        />
        <StatusItem
          title="Cancelled"
          count={counts?.cancelled || 0}
          icon={Icon.Stop}
          color={Color.Orange}
          onRefresh={revalidate}
        />
        <StatusItem
          title="Terminated"
          count={counts?.terminated || 0}
          icon={Icon.Trash}
          color={Color.Magenta}
          onRefresh={revalidate}
        />
        <StatusItem
          title="Timed Out"
          count={counts?.timedOut || 0}
          icon={Icon.Clock}
          color={Color.Yellow}
          onRefresh={revalidate}
        />
        <StatusItem
          title="Continued As New"
          count={counts?.continuedAsNew || 0}
          icon={Icon.ArrowRight}
          color={Color.Purple}
          onRefresh={revalidate}
        />
      </List.Section>

      <List.Section title="Quick Stats">
        <List.Item
          title="Success Rate"
          icon={Icon.BarChart}
          accessories={[
            {
              text: calculateSuccessRate(counts),
              tooltip: "Percentage of completed workflows out of finished workflows",
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Active Workflows"
          icon={Icon.Bolt}
          accessories={[
            {
              text: String(counts?.running || 0),
              tooltip: "Currently running workflows",
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Failure Count"
          icon={Icon.ExclamationMark}
          accessories={[
            {
              text: String((counts?.failed || 0) + (counts?.timedOut || 0)),
              tooltip: "Failed + Timed Out workflows",
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

// ============================================================================
// Components
// ============================================================================

interface DashboardDropdownProps {
  clusters: ClusterConfig[];
  selectedCluster: string;
  namespaces: NamespaceInfo[];
  selectedNamespace: string;
  timeRange: string;
  onClusterChange: (clusterName: string) => void;
  onNamespaceChange: (namespace: string) => void;
  onTimeRangeChange: (range: string) => void;
}

function DashboardDropdown({
  clusters,
  selectedCluster,
  namespaces,
  selectedNamespace,
  timeRange,
  onClusterChange,
  onNamespaceChange,
  onTimeRangeChange,
}: DashboardDropdownProps) {
  const combinedValue = `${selectedCluster}|${selectedNamespace}|${timeRange}`;

  const handleChange = (value: string) => {
    const [cluster, ns, range] = value.split("|");
    if (cluster !== selectedCluster) {
      onClusterChange(cluster);
      return;
    }
    if (ns !== selectedNamespace) {
      onNamespaceChange(ns);
    }
    if (range !== timeRange) {
      onTimeRangeChange(range);
    }
  };

  const hasMultipleClusters = clusters.length > 1;

  // Ensure we have at least the selected namespace in the list
  const effectiveNamespaces = (() => {
    if (namespaces.length === 0) {
      const cluster = clusters.find((c) => c.name === selectedCluster);
      return [
        {
          name: cluster?.namespace || selectedNamespace || "default",
          state: "Registered",
        } as NamespaceInfo,
      ];
    }
    const nsSet = new Set(namespaces.map((ns) => ns.name));
    if (selectedNamespace && !nsSet.has(selectedNamespace)) {
      return [{ name: selectedNamespace, state: "Registered" } as NamespaceInfo, ...namespaces];
    }
    return namespaces;
  })();

  if (hasMultipleClusters) {
    return (
      <List.Dropdown tooltip="Cluster / Namespace / Time Range" value={combinedValue} onChange={handleChange}>
        {/* Current cluster section */}
        <List.Dropdown.Section title={`📍 ${selectedCluster}`}>
          {effectiveNamespaces.flatMap((ns) =>
            TIME_RANGES.map((range) => (
              <List.Dropdown.Item
                key={`${selectedCluster}-${ns.name}-${range.value}`}
                title={`${ns.name} / ${range.title}`}
                value={`${selectedCluster}|${ns.name}|${range.value}`}
              />
            ))
          )}
        </List.Dropdown.Section>

        {/* Other clusters */}
        {clusters
          .filter((c) => c.name !== selectedCluster)
          .map((cluster) => (
            <List.Dropdown.Section key={`section-${cluster.name}`} title={`📍 ${cluster.name}`}>
              <List.Dropdown.Item
                key={`switch-${cluster.name}`}
                title={`Switch to ${cluster.name}`}
                value={`${cluster.name}|${cluster.namespace}|24h`}
              />
            </List.Dropdown.Section>
          ))}
      </List.Dropdown>
    );
  }

  return (
    <List.Dropdown tooltip="Namespace & Time Range" value={combinedValue} onChange={handleChange}>
      {effectiveNamespaces.flatMap((ns) =>
        TIME_RANGES.map((range) => (
          <List.Dropdown.Item
            key={`${selectedCluster}-${ns.name}-${range.value}`}
            title={`${ns.name} / ${range.title}`}
            value={`${selectedCluster}|${ns.name}|${range.value}`}
          />
        ))
      )}
    </List.Dropdown>
  );
}

interface StatusItemProps {
  title: string;
  count: number;
  icon: Icon;
  color: Color;
  onRefresh: () => void;
}

function StatusItem({ title, count, icon, color, onRefresh }: StatusItemProps) {
  return (
    <List.Item
      title={title}
      icon={{ source: icon, tintColor: color }}
      accessories={[{ tag: { value: String(count), color } }]}
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={onRefresh}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    />
  );
}

// ============================================================================
// Helpers
// ============================================================================

function calculateSuccessRate(counts: WorkflowCounts | null | undefined): string {
  if (!counts) return "N/A";

  const finished = counts.completed + counts.failed + counts.cancelled + counts.terminated + counts.timedOut;
  if (finished === 0) return "N/A";

  const rate = (counts.completed / finished) * 100;
  return `${rate.toFixed(1)}%`;
}
