import { showToast, Toast } from "@raycast/api";
import { Connection, Client } from "@temporalio/client";
import { temporal } from "@temporalio/proto";
import LongModule from "long";
import { ClusterConfig, HistoryEvent, NamespaceInfo, ScheduleInfo, WorkflowInfo, WorkflowStatus } from "./types";
import { getClustersFromStorage } from "./storage";

// Current cluster override (set by cluster switcher)
let currentClusterOverride: ClusterConfig | null = null;

// Current namespace override (set by namespace switcher)
let currentNamespaceOverride: string | null = null;

// Cached clusters (loaded once per session)
let cachedClusters: ClusterConfig[] | null = null;

// Cached Temporal client connection
let cachedConnection: Connection | null = null;
let cachedClient: Client | null = null;
let cachedClientConfig: { address: string; namespace: string; apiKey?: string } | null = null;

/**
 * Get all configured clusters
 * Uses cache to avoid repeated LocalStorage reads
 */
export async function getClusters(): Promise<ClusterConfig[]> {
  if (cachedClusters) {
    return cachedClusters;
  }
  cachedClusters = await getClustersFromStorage();
  return cachedClusters;
}

/**
 * Invalidate clusters cache (call after add/edit/delete)
 */
export function invalidateClustersCache(): void {
  cachedClusters = null;
  // Also invalidate client cache when clusters change
  invalidateClientCache();
}

/**
 * Invalidate the cached Temporal client
 */
function invalidateClientCache(): void {
  if (cachedConnection) {
    cachedConnection.close().catch(() => {
      // Ignore close errors
    });
  }
  cachedConnection = null;
  cachedClient = null;
  cachedClientConfig = null;
}

/**
 * Set the current cluster (overrides default)
 */
export function setCurrentCluster(cluster: ClusterConfig | null): void {
  currentClusterOverride = cluster;
  // Reset namespace override when cluster changes
  currentNamespaceOverride = null;
  // Invalidate client cache when cluster changes
  invalidateClientCache();
}

/**
 * Get the current cluster (sync version using cache/override)
 */
export function getCurrentCluster(): ClusterConfig {
  if (currentClusterOverride) {
    return currentClusterOverride;
  }
  // Use cached clusters if available
  if (cachedClusters && cachedClusters.length > 0) {
    return cachedClusters[0];
  }
  // Fallback default
  return {
    name: "Local",
    address: "localhost:7233",
    namespace: "default",
    connectionType: "local",
  };
}

/**
 * Set the current namespace (overrides cluster default)
 */
export function setCurrentNamespace(namespace: string | null): void {
  currentNamespaceOverride = namespace;
  // Invalidate client cache when namespace changes
  invalidateClientCache();
}

/**
 * Get the current namespace (from override or cluster default)
 */
export function getCurrentNamespace(): string {
  if (currentNamespaceOverride) {
    return currentNamespaceOverride;
  }
  const cluster = getCurrentCluster();
  return cluster.namespace || "default";
}

/**
 * Determine if TLS should be enabled based on the connection type and address
 */
function shouldUseTls(cluster: ClusterConfig): boolean {
  // Cloud connections always use TLS
  if (cluster.connectionType === "cloud") {
    return true;
  }
  // Check for cloud-like addresses
  if (cluster.address.includes(".tmprl.cloud") || cluster.address.includes(".temporal.io")) {
    return true;
  }
  // Use TLS if API key is provided (likely cloud)
  if (cluster.apiKey) {
    return true;
  }
  // No TLS for local/self-hosted
  return false;
}

/**
 * Get or create a Temporal client for the current cluster/namespace
 */
async function getClient(): Promise<Client> {
  const cluster = getCurrentCluster();
  const namespace = getCurrentNamespace();

  const currentConfig = {
    address: cluster.address,
    namespace,
    apiKey: cluster.apiKey,
  };

  // Check if we can reuse the cached client
  if (
    cachedClient &&
    cachedClientConfig &&
    cachedClientConfig.address === currentConfig.address &&
    cachedClientConfig.namespace === currentConfig.namespace &&
    cachedClientConfig.apiKey === currentConfig.apiKey
  ) {
    return cachedClient;
  }

  // Close existing connection if any
  invalidateClientCache();

  // Create new connection
  const useTls = shouldUseTls(cluster);

  const connectionOptions: Parameters<typeof Connection.connect>[0] = {
    address: cluster.address,
    connectTimeout: 10000, // 10 second timeout
  };

  if (useTls) {
    connectionOptions.tls = true;
  }

  if (cluster.apiKey) {
    connectionOptions.apiKey = cluster.apiKey;
  }

  cachedConnection = await Connection.connect(connectionOptions);

  cachedClient = new Client({
    connection: cachedConnection,
    namespace,
  });

  cachedClientConfig = currentConfig;

  return cachedClient;
}

/**
 * Map Temporal SDK status to our WorkflowStatus type
 */
function mapStatus(status: string): WorkflowStatus {
  // SDK returns statuses like "RUNNING", "COMPLETED", etc.
  const normalizedStatus = status.replace("WORKFLOW_EXECUTION_STATUS_", "").toUpperCase();

  switch (normalizedStatus) {
    case "RUNNING":
      return "RUNNING";
    case "COMPLETED":
      return "COMPLETED";
    case "FAILED":
      return "FAILED";
    case "CANCELLED":
    case "CANCELED":
      return "CANCELLED";
    case "TERMINATED":
      return "TERMINATED";
    case "TIMED_OUT":
    case "TIMEDOUT":
      return "TIMED_OUT";
    case "CONTINUED_AS_NEW":
    case "CONTINUEDASNEW":
      return "CONTINUED_AS_NEW";
    default:
      return "UNKNOWN";
  }
}

/**
 * Decode search attributes from SDK format
 */
function decodeSearchAttributes(searchAttributes?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!searchAttributes) return undefined;

  const decoded: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(searchAttributes)) {
    // SDK already decodes payloads, but we may need to handle arrays
    if (Array.isArray(value) && value.length === 1) {
      decoded[key] = value[0];
    } else {
      decoded[key] = value;
    }
  }
  return decoded;
}

/**
 * Decode memo from SDK format
 */
function decodeMemo(memo?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!memo) return undefined;
  // SDK already decodes payloads
  return memo;
}

/**
 * List workflows with optional query filter
 */
export async function listWorkflows(query?: string): Promise<WorkflowInfo[]> {
  const client = await getClient();
  const workflows: WorkflowInfo[] = [];

  const listOptions: { query?: string } = {};
  if (query) {
    listOptions.query = query;
  }

  let count = 0;
  const maxResults = 100;

  for await (const workflow of client.workflow.list(listOptions)) {
    workflows.push({
      workflowId: workflow.workflowId,
      runId: workflow.runId,
      type: workflow.type,
      status: mapStatus(workflow.status.name),
      startTime: workflow.startTime,
      closeTime: workflow.closeTime ?? undefined,
      taskQueue: workflow.taskQueue,
      historyLength: workflow.historyLength,
      memo: decodeMemo(workflow.memo as Record<string, unknown> | undefined),
      searchAttributes: decodeSearchAttributes(workflow.searchAttributes as Record<string, unknown> | undefined),
      parentWorkflowId: workflow.parentExecution?.workflowId ?? undefined,
      parentRunId: workflow.parentExecution?.runId ?? undefined,
    });

    count++;
    if (count >= maxResults) break;
  }

  return workflows;
}

/**
 * Get detailed information about a specific workflow
 */
export async function getWorkflowDetails(
  workflowId: string,
  runId?: string,
  namespaceOverride?: string
): Promise<WorkflowInfo> {
  // Temporarily set namespace if override provided
  const originalNamespace = currentNamespaceOverride;
  if (namespaceOverride) {
    currentNamespaceOverride = namespaceOverride;
    invalidateClientCache();
  }

  try {
    const client = await getClient();
    const handle = client.workflow.getHandle(workflowId, runId);
    const description = await handle.describe();

    return {
      workflowId: description.workflowId,
      runId: description.runId,
      type: description.type,
      status: mapStatus(description.status.name),
      startTime: description.startTime,
      closeTime: description.closeTime ?? undefined,
      taskQueue: description.taskQueue,
      historyLength: description.historyLength,
      memo: decodeMemo(description.memo as Record<string, unknown> | undefined),
      searchAttributes: decodeSearchAttributes(description.searchAttributes as Record<string, unknown> | undefined),
      parentWorkflowId: description.parentExecution?.workflowId ?? undefined,
      parentRunId: description.parentExecution?.runId ?? undefined,
    };
  } finally {
    // Restore original namespace
    if (namespaceOverride) {
      currentNamespaceOverride = originalNamespace;
      invalidateClientCache();
    }
  }
}

/**
 * Cancel a workflow (graceful cancellation)
 */
export async function cancelWorkflow(workflowId: string, runId?: string): Promise<void> {
  const client = await getClient();
  const handle = client.workflow.getHandle(workflowId, runId);
  await handle.cancel();
}

/**
 * Terminate a workflow (immediate termination)
 */
export async function terminateWorkflow(workflowId: string, reason: string, runId?: string): Promise<void> {
  const client = await getClient();
  const handle = client.workflow.getHandle(workflowId, runId);
  await handle.terminate(reason);
}

/**
 * Test connection for a specific cluster configuration.
 * Uses namespace-aware operations that work with namespace-scoped API keys.
 * Returns the namespace info if successful.
 */
export async function testConnectionForCluster(
  cluster: ClusterConfig
): Promise<{ success: boolean; namespace?: NamespaceInfo; error?: string }> {
  // Capture the current override state (may be null, meaning "no override")
  const previousClusterOverride = currentClusterOverride;
  setCurrentCluster(cluster);

  try {
    const client = await getClient();
    const workflowService = client.workflowService;
    const namespace = cluster.namespace || "default";

    // Use describeNamespace instead of listNamespaces - this works with namespace-scoped API keys
    const response = await workflowService.describeNamespace({ namespace });

    const namespaceInfo: NamespaceInfo = {
      name: response.namespaceInfo?.name || namespace,
      state: response.namespaceInfo?.state?.toString() || "REGISTERED",
      description: response.namespaceInfo?.description ?? undefined,
    } as NamespaceInfo;

    return { success: true, namespace: namespaceInfo };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  } finally {
    // Restore the previous override state (null means "no override")
    currentClusterOverride = previousClusterOverride;
    invalidateClientCache();
  }
}

/**
 * Show an error toast with connection troubleshooting info
 */
export async function showConnectionError(error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);

  let title = "Connection Failed";
  let toastMessage = message;

  if (message.includes("ECONNREFUSED") || message.includes("failed to connect")) {
    title = "Cannot Connect to Temporal";
    toastMessage = "Make sure Temporal server is running";
  } else if (message.includes("certificate") || message.includes("TLS") || message.includes("SSL")) {
    title = "TLS/Certificate Error";
    toastMessage = "Check your certificate configuration";
  } else if (
    message.includes("UNAUTHENTICATED") ||
    message.includes("unauthorized") ||
    message.includes("Unauthorized") ||
    message.includes("PERMISSION_DENIED")
  ) {
    title = "Authentication Failed";
    toastMessage = "Check your API key or credentials";
  } else if (message.includes("NOT_FOUND") || message.includes("not found")) {
    title = "Not Found";
    toastMessage = "Check your namespace and server address";
  } else if (message.includes("namespace")) {
    title = "Namespace Error";
    toastMessage = "Check your namespace configuration";
  } else if (message.includes("DEADLINE_EXCEEDED") || message.includes("timeout")) {
    title = "Connection Timeout";
    toastMessage = "Server not responding - check address and network";
  }

  await showToast({
    style: Toast.Style.Failure,
    title,
    message: toastMessage,
  });
}

// ============================================================================
// Namespace Operations
// ============================================================================

/**
 * List all available namespaces.
 * Note: For Temporal Cloud with namespace-scoped API keys, this may fail.
 * In that case, it falls back to returning just the configured namespace.
 */
export async function listNamespaces(): Promise<NamespaceInfo[]> {
  const client = await getClient();
  const workflowService = client.workflowService;
  const cluster = getCurrentCluster();
  const currentNamespace = getCurrentNamespace();

  try {
    // Try to list all namespaces (works for local/self-hosted or cluster-admin API keys)
    const response = await workflowService.listNamespaces({});
    const namespaces: NamespaceInfo[] = [];

    for (const ns of response.namespaces || []) {
      if (ns.namespaceInfo?.name) {
        namespaces.push({
          name: ns.namespaceInfo.name,
          state: ns.namespaceInfo.state?.toString() || "unknown",
          description: ns.namespaceInfo.description ?? undefined,
        });
      }
    }

    return namespaces;
  } catch (error) {
    // For namespace-scoped API keys on Temporal Cloud, listNamespaces fails
    // Fall back to describing just the configured namespace
    const message = error instanceof Error ? error.message : String(error);
    if (
      cluster.connectionType === "cloud" ||
      message.includes("namespace mismatch") ||
      message.includes("INVALID_ARGUMENT")
    ) {
      try {
        const response = await workflowService.describeNamespace({ namespace: currentNamespace });
        return [
          {
            name: response.namespaceInfo?.name || currentNamespace,
            state: response.namespaceInfo?.state?.toString() || "REGISTERED",
            description: response.namespaceInfo?.description ?? undefined,
          },
        ];
      } catch {
        // If describeNamespace also fails, return the configured namespace
        return [{ name: currentNamespace, state: "unknown" }];
      }
    }
    // Re-throw for other errors
    throw error;
  }
}

// ============================================================================
// Workflow History
// ============================================================================

/**
 * Convert a protobuf Timestamp to a JavaScript Date
 */
function tsToDate(ts: { seconds?: number | Long | null; nanos?: number | null } | null | undefined): Date {
  if (!ts) {
    return new Date();
  }
  // Handle Long type (from protobuf) - it has toNumber() method
  const seconds =
    typeof ts.seconds === "object" && ts.seconds !== null && "toNumber" in ts.seconds
      ? (ts.seconds as { toNumber(): number }).toNumber()
      : Number(ts.seconds || 0);
  const nanos = ts.nanos || 0;
  return new Date(seconds * 1000 + Math.floor(nanos / 1_000_000));
}

// Type for Long (from protobuf)
type Long = { toNumber(): number };

/**
 * Get workflow history events
 */
export async function getWorkflowHistory(workflowId: string, runId?: string): Promise<HistoryEvent[]> {
  const client = await getClient();
  const handle = client.workflow.getHandle(workflowId, runId);

  const events: HistoryEvent[] = [];

  // Fetch history using the handle
  const history = await handle.fetchHistory();

  for (const event of history.events || []) {
    events.push({
      eventId: Number(event.eventId),
      eventTime: tsToDate(event.eventTime),
      eventType: formatEventType(event.eventType),
      details: extractEventDetails(event as unknown as Record<string, unknown>),
    });
  }

  return events;
}

/**
 * Format event type to be more readable
 */
function formatEventType(eventType: temporal.api.enums.v1.EventType | null | undefined): string {
  if (eventType === null || eventType === undefined) {
    return "Unknown";
  }
  // Get the string name from the enum value
  const eventTypeName = temporal.api.enums.v1.EventType[eventType] || "UNKNOWN";
  return eventTypeName
    .replace("EVENT_TYPE_", "")
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Extract relevant details from an event
 */
function extractEventDetails(event: Record<string, unknown>): Record<string, unknown> {
  const details: Record<string, unknown> = {};

  // Extract common attributes
  const attributeKeys = Object.keys(event).filter((key) => key.endsWith("Attributes"));

  for (const key of attributeKeys) {
    const attrs = event[key] as Record<string, unknown> | undefined;
    if (attrs) {
      // Copy all attributes
      Object.assign(details, attrs);

      // Extract activity type name if present
      if (attrs.activityType && typeof attrs.activityType === "object") {
        const activityType = attrs.activityType as { name?: string };
        if (activityType.name) {
          details.activityTypeName = activityType.name;
        }
      }

      // Extract workflow type name if present
      if (attrs.workflowType && typeof attrs.workflowType === "object") {
        const workflowType = attrs.workflowType as { name?: string };
        if (workflowType.name) {
          details.workflowTypeName = workflowType.name;
        }
      }

      // Ensure scheduledEventId is converted to number for activity events
      if (attrs.scheduledEventId !== undefined) {
        const scheduledEventId = attrs.scheduledEventId;
        // Handle Long type
        details.scheduledEventId =
          typeof scheduledEventId === "object" && scheduledEventId !== null && "toNumber" in scheduledEventId
            ? (scheduledEventId as { toNumber(): number }).toNumber()
            : Number(scheduledEventId);
      }
    }
  }

  return details;
}

// ============================================================================
// Signal Workflow
// ============================================================================

/**
 * Send a signal to a workflow
 */
export async function signalWorkflow(
  workflowId: string,
  signalName: string,
  payload?: unknown,
  runId?: string
): Promise<void> {
  const client = await getClient();
  const handle = client.workflow.getHandle(workflowId, runId);

  // Signal with optional payload
  if (payload !== undefined) {
    await handle.signal(signalName, payload);
  } else {
    await handle.signal(signalName);
  }
}

// ============================================================================
// Query Workflow
// ============================================================================

/**
 * Query a workflow
 */
export async function queryWorkflow(
  workflowId: string,
  queryType: string,
  args?: unknown,
  runId?: string
): Promise<unknown> {
  const client = await getClient();
  const handle = client.workflow.getHandle(workflowId, runId);

  // Query with optional args
  if (args !== undefined) {
    return await handle.query(queryType, args);
  } else {
    return await handle.query(queryType);
  }
}

// ============================================================================
// Schedules
// ============================================================================

/**
 * List all schedules
 */
export async function listSchedules(): Promise<ScheduleInfo[]> {
  const client = await getClient();
  const schedules: ScheduleInfo[] = [];

  for await (const schedule of client.schedule.list()) {
    schedules.push({
      scheduleId: schedule.scheduleId,
      memo: schedule.memo as Record<string, unknown> | undefined,
      isPaused: schedule.state?.paused || false,
      numActions: 0, // Will be populated from describe
      numActionsSkipped: 0,
      nextActionTimes: schedule.info?.nextActionTimes || [],
      recentActions: (schedule.info?.recentActions || []).map((a) => ({
        scheduledAt: a.scheduledAt || new Date(),
        startedAt: a.takenAt || new Date(),
        workflowId: a.action?.workflow?.workflowId,
        runId: a.action?.workflow?.firstExecutionRunId,
      })),
      workflowType: undefined, // Will be populated from describe if needed
      createdAt: undefined, // Not available in list summary
      updatedAt: undefined,
    });
  }

  return schedules;
}

/**
 * Get schedule details
 */
export async function getScheduleDetails(scheduleId: string): Promise<{
  schedule: ScheduleInfo;
  workflowType?: string;
  taskQueue?: string;
  spec?: Record<string, unknown>;
}> {
  const client = await getClient();
  const handle = client.schedule.getHandle(scheduleId);
  const description = await handle.describe();

  const workflowAction = description.action as
    | {
        type: string;
        workflowType?: string;
        taskQueue?: string;
      }
    | undefined;

  return {
    schedule: {
      scheduleId,
      memo: description.memo as Record<string, unknown> | undefined,
      isPaused: description.state?.paused || false,
      numActions: description.info?.numActionsTaken || 0,
      numActionsSkipped: description.info?.numActionsMissedCatchupWindow || 0,
      nextActionTimes: description.info?.nextActionTimes || [],
      recentActions: (description.info?.recentActions || []).map((a) => ({
        scheduledAt: a.scheduledAt || new Date(),
        startedAt: a.takenAt || new Date(),
        workflowId: a.action?.workflow?.workflowId,
        runId: a.action?.workflow?.firstExecutionRunId,
      })),
      workflowType: workflowAction?.workflowType,
      createdAt: description.info?.createdAt,
      updatedAt: description.info?.lastUpdatedAt,
    },
    workflowType: workflowAction?.workflowType,
    taskQueue: workflowAction?.taskQueue,
    spec: description.spec as unknown as Record<string, unknown>,
  };
}

/**
 * Pause a schedule
 */
export async function pauseSchedule(scheduleId: string, reason?: string): Promise<void> {
  const client = await getClient();
  const handle = client.schedule.getHandle(scheduleId);
  await handle.pause(reason || "Paused via Raycast");
}

/**
 * Unpause a schedule
 */
export async function unpauseSchedule(scheduleId: string, reason?: string): Promise<void> {
  const client = await getClient();
  const handle = client.schedule.getHandle(scheduleId);
  await handle.unpause(reason || "Unpaused via Raycast");
}

/**
 * Trigger a schedule immediately
 */
export async function triggerSchedule(scheduleId: string): Promise<void> {
  const client = await getClient();
  const handle = client.schedule.getHandle(scheduleId);
  await handle.trigger();
}

/**
 * Delete a schedule
 */
export async function deleteSchedule(scheduleId: string): Promise<void> {
  const client = await getClient();
  const handle = client.schedule.getHandle(scheduleId);
  await handle.delete();
}

// ============================================================================
// Start Workflow
// ============================================================================

/**
 * Start a new workflow
 */
export async function startWorkflow(params: {
  workflowId: string;
  workflowType: string;
  taskQueue: string;
  input?: unknown;
}): Promise<{ runId: string }> {
  const client = await getClient();

  const args = params.input !== undefined ? [params.input] : [];

  const handle = await client.workflow.start(params.workflowType, {
    workflowId: params.workflowId,
    taskQueue: params.taskQueue,
    args,
  });

  return { runId: handle.firstExecutionRunId };
}

// ============================================================================
// Reset Workflow
// ============================================================================

/**
 * Reset a workflow to a specific event
 */
export async function resetWorkflow(params: {
  workflowId: string;
  runId: string;
  workflowTaskFinishEventId: number;
  reason: string;
  resetReapplyType?: "RESET_REAPPLY_TYPE_SIGNAL" | "RESET_REAPPLY_TYPE_NONE" | "RESET_REAPPLY_TYPE_ALL_ELIGIBLE";
}): Promise<{ runId: string }> {
  const client = await getClient();

  // Use raw gRPC service for reset
  const workflowService = client.workflowService;
  const namespace = getCurrentNamespace();

  const response = await workflowService.resetWorkflowExecution({
    namespace,
    workflowExecution: {
      workflowId: params.workflowId,
      runId: params.runId,
    },
    workflowTaskFinishEventId: LongModule.fromNumber(params.workflowTaskFinishEventId),
    reason: params.reason,
    requestId: crypto.randomUUID(),
  });

  return { runId: response.runId ?? "unknown" };
}

// ============================================================================
// Search Attributes
// ============================================================================

/**
 * Format indexed value type to the format expected by the UI
 * The SDK returns numeric enum values, we need to convert to string names
 */
function formatIndexedValueType(type: unknown): string {
  // Numeric enum values from Temporal
  const typeMap: Record<number, string> = {
    0: "UNSPECIFIED",
    1: "TEXT",
    2: "KEYWORD",
    3: "INT",
    4: "DOUBLE",
    5: "BOOL",
    6: "DATETIME",
    7: "KEYWORD_LIST",
  };

  if (typeof type === "number") {
    return typeMap[type] || `UNKNOWN_${type}`;
  }

  if (typeof type === "string") {
    // Handle string format (e.g., "INDEXED_VALUE_TYPE_KEYWORD")
    return type.replace("INDEXED_VALUE_TYPE_", "");
  }

  return "UNKNOWN";
}

/**
 * Check if an attribute name is a system/built-in attribute
 * These are either Temporal-specific or generic slot names (Keyword01, Text01, etc.)
 */
function isSystemOrGenericAttribute(name: string): boolean {
  // Temporal system attributes
  const systemPrefixes = [
    "Temporal",
    "Build",
    "Execution",
    "Start",
    "Close",
    "History",
    "Run",
    "State",
    "Task",
    "Workflow",
    "Batch",
    "Root",
    "Parent",
    "Binary",
  ];

  // Generic slot names (Keyword01, Text02, Int03, etc.)
  const genericPattern = /^(Keyword|Text|Int|Double|Bool|Datetime|KeywordList)\d+$/;

  return systemPrefixes.some((prefix) => name.startsWith(prefix)) || genericPattern.test(name);
}

/**
 * Get search attributes for the namespace.
 *
 * LIMITATION: For Temporal Cloud with namespace-scoped API keys, custom search attributes
 * cannot be discovered programmatically. The available APIs have the following issues:
 * - OperatorService.listSearchAttributes: Returns PERMISSION_DENIED for namespace-scoped keys
 * - WorkflowService.getSearchAttributes: Returns "namespace mismatch" error (no namespace in request body)
 * - describeNamespace: Does not include customSearchAttributeAliases in the response
 *
 * As a result, only system/default search attributes are shown for Temporal Cloud connections.
 * Users can view their custom search attributes in the Temporal Cloud UI.
 */
export async function getSearchAttributes(): Promise<{
  system: Array<{ name: string; type: string }>;
  custom: Array<{ name: string; type: string }>;
}> {
  const client = await getClient();
  const namespace = getCurrentNamespace();
  const cluster = getCurrentCluster();

  // For Temporal Cloud, return hardcoded system attributes only.
  // Custom attributes cannot be discovered with namespace-scoped API keys (see function comment).
  if (cluster.connectionType === "cloud") {
    // Standard Temporal Cloud search attributes (always available)
    const system: Array<{ name: string; type: string }> = [
      { name: "BatcherUser", type: "KEYWORD" },
      { name: "BinaryChecksums", type: "KEYWORD_LIST" },
      { name: "BuildIds", type: "KEYWORD_LIST" },
      { name: "CloseTime", type: "DATETIME" },
      { name: "ExecutionDuration", type: "INT" },
      { name: "ExecutionStatus", type: "KEYWORD" },
      { name: "ExecutionTime", type: "DATETIME" },
      { name: "HistoryLength", type: "INT" },
      { name: "HistorySizeBytes", type: "INT" },
      { name: "RunId", type: "KEYWORD" },
      { name: "StartTime", type: "DATETIME" },
      { name: "StateTransitionCount", type: "INT" },
      { name: "TaskQueue", type: "KEYWORD" },
      { name: "TemporalScheduledById", type: "KEYWORD" },
      { name: "TemporalScheduledStartTime", type: "DATETIME" },
      { name: "TemporalSchedulePaused", type: "BOOL" },
      { name: "WorkflowId", type: "KEYWORD" },
      { name: "WorkflowType", type: "KEYWORD" },
    ];

    system.sort((a, b) => a.name.localeCompare(b.name));

    // Return empty custom array - custom attributes cannot be discovered for cloud
    return { system, custom: [] };
  }

  // For local/self-hosted, use the standard getSearchAttributes API
  const workflowService = client.workflowService;

  const searchAttrsResponse = await workflowService.getSearchAttributes({
    namespace,
  });

  // Get namespace info for custom search attribute aliases
  const namespaceResponse = await workflowService.describeNamespace({
    namespace,
  });

  const system: Array<{ name: string; type: string }> = [];
  const custom: Array<{ name: string; type: string }> = [];

  // Custom search attribute aliases: { "genericSlot": "customName" }
  // e.g., { "Keyword10": "UserID", "Text01": "CustomTextField" }
  const aliases = (namespaceResponse.config?.customSearchAttributeAliases || {}) as Record<string, string>;

  // Set of generic slot names that have custom aliases
  const slotsWithAliases = new Set(Object.keys(aliases));

  // Process all keys from getSearchAttributes response
  const keys = (searchAttrsResponse.keys || {}) as Record<string, unknown>;

  for (const [name, indexedValueType] of Object.entries(keys)) {
    const typeStr = formatIndexedValueType(indexedValueType);

    // Check if this is a generic slot with a custom alias
    if (slotsWithAliases.has(name)) {
      // Use the custom alias name instead of the generic slot name
      const customName = aliases[name];
      custom.push({ name: customName, type: typeStr });
    } else if (isSystemOrGenericAttribute(name)) {
      // System attribute or unused generic slot - add to system
      system.push({ name, type: typeStr });
    } else {
      // Custom attribute without alias (self-hosted may have direct custom attrs)
      custom.push({ name, type: typeStr });
    }
  }

  // Sort for consistent display
  system.sort((a, b) => a.name.localeCompare(b.name));
  custom.sort((a, b) => a.name.localeCompare(b.name));

  return { system, custom };
}

// ============================================================================
// Utility Operations
// ============================================================================

/**
 * Count workflows matching a query
 */
export async function countWorkflows(query: string): Promise<number> {
  const client = await getClient();
  const result = await client.workflow.count(query);
  return result.count;
}
