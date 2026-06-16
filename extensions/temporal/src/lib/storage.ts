import { LocalStorage } from "@raycast/api";
import { ClusterConfig, WorkflowInfo } from "./types";

const RECENT_WORKFLOWS_KEY = "recentWorkflows";
const SELECTED_NAMESPACE_KEY = "selectedNamespace";
const SELECTED_CLUSTER_KEY = "selectedCluster";
const CLUSTERS_KEY = "clusters";
const MAX_RECENT_WORKFLOWS = 10;

// ============================================================================
// Cluster Storage (Primary Configuration)
// ============================================================================

/**
 * Default cluster created on first run
 */
const DEFAULT_CLUSTER: ClusterConfig = {
  name: "Local",
  address: "localhost:7233",
  namespace: "default",
  connectionType: "local",
  webUiUrl: "http://localhost:8233",
};

/**
 * Get all clusters from LocalStorage
 * If none exist, creates and returns the default local cluster
 */
export async function getClustersFromStorage(): Promise<ClusterConfig[]> {
  const stored = await LocalStorage.getItem<string>(CLUSTERS_KEY);

  if (!stored) {
    // First run - create default cluster
    await saveClustersToStorage([DEFAULT_CLUSTER]);
    return [DEFAULT_CLUSTER];
  }

  try {
    const clusters = JSON.parse(stored) as ClusterConfig[];
    // Validate and migrate clusters
    const migrated = clusters
      .filter((c) => c && c.name && c.namespace)
      .map((c) => {
        // Migrate old format (url) to new format (address)
        if (!c.address && (c as { url?: string }).url) {
          const oldUrl = (c as { url?: string }).url!;
          // Extract host from URL, default to gRPC port
          try {
            const url = new URL(oldUrl);
            return {
              ...c,
              address: `${url.hostname}:7233`,
              connectionType: c.connectionType || "local",
            } as ClusterConfig;
          } catch {
            return {
              ...c,
              address: "localhost:7233",
              connectionType: "local",
            } as ClusterConfig;
          }
        }
        // Ensure connectionType has a default
        return {
          ...c,
          connectionType: c.connectionType || "local",
        } as ClusterConfig;
      });

    if (migrated.length === 0) {
      // Invalid data - reset to default
      await saveClustersToStorage([DEFAULT_CLUSTER]);
      return [DEFAULT_CLUSTER];
    }

    // Save migrated data if any migration occurred
    const needsMigration = clusters.some((c) => !c.address && (c as { url?: string }).url);
    if (needsMigration) {
      await saveClustersToStorage(migrated);
    }

    return migrated;
  } catch {
    // Parse error - reset to default
    await saveClustersToStorage([DEFAULT_CLUSTER]);
    return [DEFAULT_CLUSTER];
  }
}

/**
 * Save all clusters to LocalStorage
 */
export async function saveClustersToStorage(clusters: ClusterConfig[]): Promise<void> {
  await LocalStorage.setItem(CLUSTERS_KEY, JSON.stringify(clusters));
}

/**
 * Add a new cluster
 * Returns error message if name already exists, otherwise undefined
 */
export async function addCluster(cluster: ClusterConfig): Promise<string | undefined> {
  const clusters = await getClustersFromStorage();

  // Check for duplicate name
  if (clusters.some((c) => c.name.toLowerCase() === cluster.name.toLowerCase())) {
    return `A connection named "${cluster.name}" already exists`;
  }

  clusters.push(cluster);
  await saveClustersToStorage(clusters);
  return undefined;
}

/**
 * Update an existing cluster
 * @param originalName - The original name of the cluster (for lookup)
 * @param cluster - The updated cluster config
 * Returns error message if validation fails, otherwise undefined
 */
export async function updateCluster(originalName: string, cluster: ClusterConfig): Promise<string | undefined> {
  const clusters = await getClustersFromStorage();

  const index = clusters.findIndex((c) => c.name === originalName);
  if (index === -1) {
    return `Connection "${originalName}" not found`;
  }

  // Check for duplicate name (if name changed)
  if (cluster.name !== originalName && clusters.some((c) => c.name.toLowerCase() === cluster.name.toLowerCase())) {
    return `A connection named "${cluster.name}" already exists`;
  }

  clusters[index] = cluster;
  await saveClustersToStorage(clusters);

  // Update selected cluster name if it was renamed
  const selectedCluster = await getSelectedCluster();
  if (selectedCluster === originalName) {
    await setSelectedCluster(cluster.name);
  }

  return undefined;
}

/**
 * Delete a cluster by name
 * Returns error message if it's the last cluster or not found
 */
export async function deleteCluster(name: string): Promise<string | undefined> {
  const clusters = await getClustersFromStorage();

  if (clusters.length <= 1) {
    return "Cannot delete the last connection. At least one connection is required.";
  }

  const index = clusters.findIndex((c) => c.name === name);
  if (index === -1) {
    return `Connection "${name}" not found`;
  }

  clusters.splice(index, 1);
  await saveClustersToStorage(clusters);

  // If deleted cluster was selected, select first available
  const selectedCluster = await getSelectedCluster();
  if (selectedCluster === name) {
    await setSelectedCluster(clusters[0].name);
  }

  return undefined;
}

/**
 * Get a cluster by name
 */
export async function getClusterByName(name: string): Promise<ClusterConfig | undefined> {
  const clusters = await getClustersFromStorage();
  return clusters.find((c) => c.name === name);
}

/**
 * Minimal workflow info for storage (to reduce storage size)
 */
export interface RecentWorkflow {
  workflowId: string;
  runId: string;
  type: string;
  namespace: string;
  cluster: string; // Cluster name
  viewedAt: number; // timestamp
}

/**
 * Get recently viewed workflows
 */
export async function getRecentWorkflows(): Promise<RecentWorkflow[]> {
  const stored = await LocalStorage.getItem<string>(RECENT_WORKFLOWS_KEY);
  if (!stored) return [];

  try {
    return JSON.parse(stored) as RecentWorkflow[];
  } catch {
    return [];
  }
}

/**
 * Add a workflow to recent workflows
 */
export async function addRecentWorkflow(workflow: WorkflowInfo, namespace: string, cluster: string): Promise<void> {
  const recents = await getRecentWorkflows();

  // Remove if already exists (will re-add at top)
  const filtered = recents.filter((r) => !(r.workflowId === workflow.workflowId && r.runId === workflow.runId));

  // Add to beginning
  const newRecent: RecentWorkflow = {
    workflowId: workflow.workflowId,
    runId: workflow.runId,
    type: workflow.type,
    namespace,
    cluster,
    viewedAt: Date.now(),
  };

  const updated = [newRecent, ...filtered].slice(0, MAX_RECENT_WORKFLOWS);

  await LocalStorage.setItem(RECENT_WORKFLOWS_KEY, JSON.stringify(updated));
}

/**
 * Clear recent workflows
 */
export async function clearRecentWorkflows(): Promise<void> {
  await LocalStorage.removeItem(RECENT_WORKFLOWS_KEY);
}

/**
 * Get the selected namespace (if any)
 */
export async function getSelectedNamespace(): Promise<string | undefined> {
  return LocalStorage.getItem<string>(SELECTED_NAMESPACE_KEY);
}

/**
 * Set the selected namespace
 */
export async function setSelectedNamespace(namespace: string): Promise<void> {
  await LocalStorage.setItem(SELECTED_NAMESPACE_KEY, namespace);
}

/**
 * Get the selected cluster (if any)
 */
export async function getSelectedCluster(): Promise<string | undefined> {
  return LocalStorage.getItem<string>(SELECTED_CLUSTER_KEY);
}

/**
 * Set the selected cluster
 */
export async function setSelectedCluster(clusterName: string): Promise<void> {
  await LocalStorage.setItem(SELECTED_CLUSTER_KEY, clusterName);
}
