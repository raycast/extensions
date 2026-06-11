import { useEffect, useState, useCallback, useRef } from "react";
import { List, Icon, Action, ActionPanel, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  listWorkflows,
  listNamespaces,
  showConnectionError,
  setCurrentNamespace,
  setCurrentCluster,
  getClusters,
  getCurrentCluster,
} from "./lib/temporal-client";
import { WorkflowInfo, NamespaceInfo, ClusterConfig } from "./lib/types";
import {
  buildSearchQuery,
  formatRelativeTime,
  getStatusColor,
  getStatusIcon,
  getStatusLabel,
  getWorkflowDuration,
  truncate,
} from "./lib/utils";
import {
  getRecentWorkflows,
  addRecentWorkflow,
  getSelectedNamespace,
  setSelectedNamespace,
  getSelectedCluster,
  setSelectedCluster,
  RecentWorkflow,
} from "./lib/storage";
import WorkflowActions from "./components/workflow-actions";
import ManageConnections from "./manage-connections";

const STATUS_FILTERS: { value: string; title: string }[] = [
  { value: "all", title: "All Statuses" },
  { value: "Running", title: "Running" },
  { value: "Completed", title: "Completed" },
  { value: "Failed", title: "Failed" },
  { value: "Cancelled", title: "Cancelled" },
  { value: "Terminated", title: "Terminated" },
  { value: "TimedOut", title: "Timed Out" },
];

export default function SearchWorkflows() {
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedClusterName, setSelectedClusterName] = useState<string>("");
  const [selectedNamespace, setSelectedNamespaceState] = useState<string>("");
  const [recentWorkflows, setRecentWorkflows] = useState<RecentWorkflow[]>([]);
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
      // Get stored cluster or use first one
      const storedCluster = await getSelectedCluster();
      const clusterName =
        storedCluster && clusters.find((c) => c.name === storedCluster) ? storedCluster : clusters[0]?.name || "Local";

      const cluster = clusters.find((c) => c.name === clusterName) || clusters[0];
      setSelectedClusterName(clusterName);
      setCurrentCluster(cluster);

      // Get stored namespace or use cluster default
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
        // If we can't list namespaces, return just the cluster default
        const cluster = clusters.find((c) => c.name === clusterName);
        return [{ name: cluster?.namespace || "default", state: "Registered" }] as NamespaceInfo[];
      }
    },
    [selectedClusterName],
    { keepPreviousData: true }
  );

  // Load recent workflows for current cluster and namespace
  useEffect(() => {
    async function loadRecents() {
      const recents = await getRecentWorkflows();
      // Filter to only show recents from current cluster and namespace
      const filtered = recents.filter((r) => r.cluster === selectedClusterName && r.namespace === selectedNamespace);
      setRecentWorkflows(filtered);
    }
    if (selectedClusterName && selectedNamespace) {
      loadRecents();
    }
  }, [selectedClusterName, selectedNamespace]);

  // Handle cluster change
  const handleClusterChange = useCallback(
    (clusterName: string) => {
      try {
        const cluster = clusters.find((c) => c.name === clusterName);
        if (!cluster) {
          return;
        }

        // Reset namespace to cluster default
        const ns = cluster.namespace || "default";

        // Update React state (triggers re-render)
        setSelectedClusterName(clusterName);
        setSelectedNamespaceState(ns);

        // Set module-level state (invalidates client cache)
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
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [clusters]
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

  // Fetch workflows
  const {
    data: workflows,
    isLoading: workflowsLoading,
    error,
    revalidate,
  } = useCachedPromise(
    async (clusterName: string, namespace: string, query: string, status: string) => {
      if (!clusterName || !namespace) return [];
      const searchQuery = buildSearchQuery(query, status);
      return listWorkflows(searchQuery);
    },
    [selectedClusterName, selectedNamespace, searchText, statusFilter],
    {
      keepPreviousData: true,
      onError: showConnectionError,
    }
  );

  // Periodic refresh (every 30 seconds when the command is open)
  useEffect(() => {
    const interval = setInterval(() => {
      revalidate();
    }, 30000);

    return () => clearInterval(interval);
  }, [revalidate]);

  // Track workflow views for recents
  const handleWorkflowView = useCallback(
    async (workflow: WorkflowInfo) => {
      await addRecentWorkflow(workflow, selectedNamespace, selectedClusterName);
      // Refresh recents list
      const recents = await getRecentWorkflows();
      const filtered = recents.filter((r) => r.cluster === selectedClusterName && r.namespace === selectedNamespace);
      setRecentWorkflows(filtered);
    },
    [selectedNamespace, selectedClusterName]
  );

  const isLoading =
    clustersLoading || workflowsLoading || namespacesLoading || !selectedNamespace || !selectedClusterName;

  // Show recent workflows when search is empty and no status filter
  const showRecents = !searchText && statusFilter === "all" && recentWorkflows.length > 0;

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search by workflow ID or type..."
      searchBarAccessory={
        <CombinedDropdown
          clusters={clusters}
          selectedCluster={selectedClusterName}
          namespaces={namespaces || []}
          selectedNamespace={selectedNamespace}
          statusFilter={statusFilter}
          onClusterChange={handleClusterChange}
          onNamespaceChange={handleNamespaceChange}
          onStatusChange={setStatusFilter}
        />
      }
      throttle
    >
      {error && !workflows ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Connection Error"
          description={`Could not connect to Temporal at ${getCurrentCluster().address}. Please check your settings.`}
          actions={
            <ActionPanel>
              <Action.Push title="Manage Connections" icon={Icon.Gear} target={<ManageConnections />} />
            </ActionPanel>
          }
        />
      ) : !isLoading && workflows?.length === 0 && !showRecents ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Workflows Found"
          description={
            searchText || statusFilter !== "all"
              ? "Try adjusting your search or filter"
              : "No workflows in this namespace"
          }
        />
      ) : (
        <>
          {/* Recent Workflows Section */}
          {showRecents && (
            <List.Section title="Recent" subtitle={String(recentWorkflows.length)}>
              {recentWorkflows.map((recent) => (
                <RecentWorkflowItem
                  key={`${recent.workflowId}-${recent.runId}`}
                  recent={recent}
                  onRefresh={revalidate}
                  onView={handleWorkflowView}
                />
              ))}
            </List.Section>
          )}

          {/* All Workflows - chronologically sorted (newest first) */}
          <List.Section
            title={statusFilter !== "all" ? `${getStatusFilterLabel(statusFilter)} Workflows` : "Workflows"}
            subtitle={String(workflows?.length || 0)}
          >
            {workflows?.map((workflow) => (
              <WorkflowListItem
                key={`${workflow.workflowId}-${workflow.runId}`}
                workflow={workflow}
                onRefresh={revalidate}
                onView={handleWorkflowView}
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}

// ============================================================================
// Components
// ============================================================================

interface CombinedDropdownProps {
  clusters: ClusterConfig[];
  selectedCluster: string;
  namespaces: NamespaceInfo[];
  selectedNamespace: string;
  statusFilter: string;
  onClusterChange: (clusterName: string) => void;
  onNamespaceChange: (namespace: string) => void;
  onStatusChange: (status: string) => void;
}

function CombinedDropdown({
  clusters,
  selectedCluster,
  namespaces,
  selectedNamespace,
  statusFilter,
  onClusterChange,
  onNamespaceChange,
  onStatusChange,
}: CombinedDropdownProps) {
  // Combined dropdown value: "cluster|namespace|status"
  const combinedValue = `${selectedCluster}|${selectedNamespace}|${statusFilter}`;

  const handleChange = (value: string) => {
    const [cluster, ns, status] = value.split("|");
    if (cluster !== selectedCluster) {
      onClusterChange(cluster);
      return;
    }
    if (ns !== selectedNamespace) {
      onNamespaceChange(ns);
    }
    if (status !== statusFilter) {
      onStatusChange(status);
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
      <List.Dropdown tooltip="Cluster / Namespace / Status" value={combinedValue} onChange={handleChange}>
        {/* Current cluster section with namespaces and status filters */}
        <List.Dropdown.Section title={`📍 ${selectedCluster}`}>
          {effectiveNamespaces.flatMap((ns) =>
            STATUS_FILTERS.map((filter) => (
              <List.Dropdown.Item
                key={`${selectedCluster}-${ns.name}-${filter.value}`}
                title={`${ns.name} / ${filter.title}`}
                value={`${selectedCluster}|${ns.name}|${filter.value}`}
              />
            ))
          )}
        </List.Dropdown.Section>

        {/* Other clusters - just switch option */}
        {clusters
          .filter((c) => c.name !== selectedCluster)
          .map((cluster) => (
            <List.Dropdown.Section key={`section-${cluster.name}`} title={`📍 ${cluster.name}`}>
              <List.Dropdown.Item
                key={`switch-${cluster.name}`}
                title={`Switch to ${cluster.name}`}
                value={`${cluster.name}|${cluster.namespace}|all`}
              />
            </List.Dropdown.Section>
          ))}
      </List.Dropdown>
    );
  }

  // Single cluster - simpler dropdown with just namespace/status
  return (
    <List.Dropdown tooltip="Namespace & Status" value={combinedValue} onChange={handleChange}>
      {effectiveNamespaces.flatMap((ns) =>
        STATUS_FILTERS.map((filter) => (
          <List.Dropdown.Item
            key={`${selectedCluster}-${ns.name}-${filter.value}`}
            title={`${ns.name} / ${filter.title}`}
            value={`${selectedCluster}|${ns.name}|${filter.value}`}
          />
        ))
      )}
    </List.Dropdown>
  );
}

interface WorkflowListItemProps {
  workflow: WorkflowInfo;
  onRefresh: () => void;
  onView: (workflow: WorkflowInfo) => void;
}

function WorkflowListItem({ workflow, onRefresh, onView }: WorkflowListItemProps) {
  const statusIcon = getStatusIcon(workflow.status);
  const statusColor = getStatusColor(workflow.status);
  const statusLabel = getStatusLabel(workflow.status);
  const duration = getWorkflowDuration(workflow);
  const startedAgo = formatRelativeTime(workflow.startTime);

  return (
    <List.Item
      title={workflow.type}
      subtitle={truncate(workflow.workflowId, 28)}
      icon={{ source: statusIcon, tintColor: statusColor }}
      accessories={[
        { text: duration, tooltip: `Duration: ${duration}` },
        { text: startedAgo, tooltip: `Started: ${workflow.startTime.toLocaleString()}` },
        { tag: { value: statusLabel, color: statusColor } },
      ]}
      actions={<WorkflowActions workflow={workflow} onRefresh={onRefresh} onView={() => onView(workflow)} />}
    />
  );
}

interface RecentWorkflowItemProps {
  recent: RecentWorkflow;
  onRefresh: () => void;
  onView: (workflow: WorkflowInfo) => void;
}

function RecentWorkflowItem({ recent, onRefresh, onView }: RecentWorkflowItemProps) {
  const viewedAgo = formatRelativeTime(new Date(recent.viewedAt));

  return (
    <List.Item
      title={recent.type}
      subtitle={truncate(recent.workflowId, 28)}
      icon={Icon.Clock}
      accessories={[
        {
          text: `Viewed ${viewedAgo}`,
          tooltip: `Last viewed: ${new Date(recent.viewedAt).toLocaleString()}`,
        },
      ]}
      actions={
        <WorkflowActions
          workflow={{
            workflowId: recent.workflowId,
            runId: recent.runId,
            type: recent.type,
            status: "UNKNOWN",
            startTime: new Date(),
            taskQueue: "unknown",
          }}
          onRefresh={onRefresh}
          onView={(wf) => onView(wf)}
        />
      }
    />
  );
}

// ============================================================================
// Helpers
// ============================================================================

function getStatusFilterLabel(filter: string): string {
  const found = STATUS_FILTERS.find((f) => f.value === filter);
  return found?.title || filter;
}
