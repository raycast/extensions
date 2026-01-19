/**
 * Convex API Client for Raycast
 *
 * Provides API functions for interacting with Convex deployments
 * and the BigBrain management API.
 */

import {
  getTeams,
  getProjects,
  getDeployments,
  getProfile,
  type Team,
  type Project,
  type Deployment,
  type UserProfile,
} from "./bigbrain";
import { CONVEX_CLIENT_ID } from "./constants";

export { getTeams, getProjects, getDeployments, getProfile };
export type { Team, Project, Deployment, UserProfile };

export interface FunctionSpec {
  identifier: string;
  functionType: "query" | "mutation" | "action";
  visibility: { kind: "public" } | { kind: "internal" };
  args?: string;
  returns?: string;
}

export interface ModuleFunctions {
  path: string;
  functions: FunctionSpec[];
}

export interface TableInfo {
  name: string;
  documentCount?: number;
}

export interface Document {
  _id: string;
  _creationTime: number;
  [key: string]: unknown;
}

/**
 * Get deployment URL from deployment name
 */
export function getDeploymentUrl(deploymentName: string): string {
  return `https://${deploymentName}.convex.cloud`;
}

/**
 * Fetch all functions from a deployment using system query
 */
export async function getFunctions(
  deploymentName: string,
  accessToken: string,
): Promise<ModuleFunctions[]> {
  const url = getDeploymentUrl(deploymentName);

  // Use system query to get function API spec
  const response = await fetch(`${url}/api/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Convex ${accessToken}`,
      "Convex-Client": CONVEX_CLIENT_ID,
    },
    body: JSON.stringify({
      path: "_system/cli/modules:apiSpec",
      args: {},
      format: "json",
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to list functions: ${response.status}`);
  }

  const data = await response.json();
  const apiSpec = data.value ?? data;

  return parseApiSpec(apiSpec);
}

/**
 * Parse the apiSpec response into ModuleFunctions grouped by module path
 */
function parseApiSpec(apiSpec: unknown): ModuleFunctions[] {
  if (!Array.isArray(apiSpec)) return [];

  const moduleMap = new Map<string, FunctionSpec[]>();

  for (const fn of apiSpec) {
    if (!fn || typeof fn !== "object") continue;

    const identifier = (fn as Record<string, unknown>).identifier as string;
    if (!identifier) continue;

    const colonIndex = identifier.indexOf(":");
    const modulePath =
      colonIndex > -1 ? identifier.substring(0, colonIndex) : identifier;

    const rawFunctionType = (fn as Record<string, unknown>)
      .functionType as string;
    if (!rawFunctionType) continue;

    if (rawFunctionType === "HttpAction") continue;

    const functionType = rawFunctionType.toLowerCase() as
      | "query"
      | "mutation"
      | "action";

    const visibility = (fn as Record<string, unknown>).visibility as
      | { kind: string }
      | undefined;
    const visibilityKind =
      visibility?.kind === "public" ? "public" : "internal";

    const funcSpec: FunctionSpec = {
      identifier,
      functionType,
      visibility: { kind: visibilityKind },
      args: (fn as Record<string, unknown>).args as string | undefined,
      returns: (fn as Record<string, unknown>).returns as string | undefined,
    };

    const existing = moduleMap.get(modulePath);
    if (existing) {
      existing.push(funcSpec);
    } else {
      moduleMap.set(modulePath, [funcSpec]);
    }
  }

  const result: ModuleFunctions[] = [];
  for (const [path, functions] of moduleMap.entries()) {
    result.push({ path, functions });
  }

  result.sort((a, b) => a.path.localeCompare(b.path));

  return result;
}

/**
 * Get all tables from a deployment using the shapes2 API
 */
export async function getTables(
  deploymentName: string,
  accessToken: string,
): Promise<TableInfo[]> {
  const url = getDeploymentUrl(deploymentName);

  // Primary approach: Use /api/shapes2 endpoint which returns table schemas
  const shapesResponse = await fetch(`${url}/api/shapes2`, {
    method: "GET",
    headers: {
      Authorization: `Convex ${accessToken}`,
      "Convex-Client": CONVEX_CLIENT_ID,
    },
  });

  if (shapesResponse.ok) {
    const shapesData = await shapesResponse.json();

    if (shapesData && typeof shapesData === "object") {
      // shapes2 returns an object where keys are table names
      const tableNames = Object.keys(shapesData)
        .filter((name) => !name.startsWith("_"))
        .sort();

      return tableNames.map((name) => ({ name }));
    }
  }

  // Fallback: Use system query to get table mapping
  const response = await fetch(`${url}/api/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Convex ${accessToken}`,
      "Convex-Client": CONVEX_CLIENT_ID,
    },
    body: JSON.stringify({
      path: "_system/frontend/getTableMapping",
      args: { componentId: null },
      format: "json",
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get tables: ${response.status}`);
  }

  const data = await response.json();

  let tableNames: string[] = [];

  const mapping = data.value ?? data;
  if (mapping && typeof mapping === "object") {
    tableNames = Object.values(mapping) as string[];
  }

  return tableNames
    .filter((name) => typeof name === "string" && !name.startsWith("_"))
    .sort()
    .map((name) => ({ name }));
}

/**
 * Get documents from a table
 */
export async function getDocuments(
  deploymentName: string,
  accessToken: string,
  tableName: string,
  options?: {
    limit?: number;
    cursor?: string;
  },
): Promise<{ documents: Document[]; nextCursor?: string; isDone?: boolean }> {
  const url = getDeploymentUrl(deploymentName);
  const numItems = options?.limit ?? 25;

  const paginationOpts = {
    cursor: options?.cursor ?? null,
    numItems,
    id: Date.now(),
  };

  const response = await fetch(`${url}/api/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Convex ${accessToken}`,
      "Convex-Client": CONVEX_CLIENT_ID,
    },
    body: JSON.stringify({
      path: "_system/frontend/paginatedTableDocuments:default",
      args: {
        paginationOpts,
        table: tableName,
        filters: null,
        componentId: null,
      },
      format: "json",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Failed to get documents: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const result = data.value ?? data;

  const documents = Array.isArray(result.page) ? result.page : [];

  return {
    documents: documents as Document[],
    nextCursor: result.isDone
      ? undefined
      : (result.continueCursor ?? undefined),
    isDone: result.isDone,
  };
}

/**
 * Run a Convex function
 */
export async function runFunction(
  deploymentName: string,
  accessToken: string,
  functionPath: string,
  functionType: "query" | "mutation" | "action",
  args: Record<string, unknown> = {},
): Promise<{ result: unknown; executionTime: number }> {
  const url = getDeploymentUrl(deploymentName);
  const startTime = Date.now();

  const endpoint =
    functionType === "query"
      ? "query"
      : functionType === "mutation"
        ? "mutation"
        : "action";

  const response = await fetch(`${url}/api/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Convex ${accessToken}`,
      "Convex-Client": CONVEX_CLIENT_ID,
    },
    body: JSON.stringify({
      path: functionPath,
      args,
      format: "json",
    }),
  });

  const executionTime = Date.now() - startTime;

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(
      `Function execution failed: ${response.status} - ${errorText}`,
    );
  }

  const data = await response.json();

  if (data.status === "error" || data.errorMessage) {
    throw new Error(data.errorMessage || "Function execution failed");
  }

  return {
    result: data.value ?? data,
    executionTime,
  };
}

/**
 * Format a value for display
 */
export function formatValue(value: unknown, maxLength = 100): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") {
    if (value.length > maxLength) {
      return `"${value.substring(0, maxLength)}..."`;
    }
    return `"${value}"`;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.length} items]`;
  }
  if (typeof value === "object") {
    const keys = Object.keys(value);
    return `{${keys.length} fields}`;
  }
  return String(value);
}

// ============================================================================
// Logs API
// ============================================================================

export interface LogEntry {
  id: string;
  timestamp: number;
  functionPath: string;
  functionType: "query" | "mutation" | "action" | "http";
  status: "success" | "failure";
  executionTimeMs: number;
  cached: boolean;
  requestId: string;
  executionId: string;
  parentExecutionId: string | null;
  errorMessage?: string;
  logLines: string[];
  caller?: string;
  environment?: "isolate" | "node";
  identityType?: string;
  usage: {
    databaseReadBytes: number;
    databaseWriteBytes: number;
    storageReadBytes: number;
    storageWriteBytes: number;
    memoryUsedMb: number;
  };
  raw: unknown;
}

export interface GetLogsResponse {
  logs: LogEntry[];
  nextCursor?: string | number;
}

/**
 * Get function execution logs from a deployment
 */
export async function getLogs(
  deploymentName: string,
  accessToken: string,
  options?: {
    cursor?: string | number;
    limit?: number;
    functionFilter?: string;
  },
): Promise<GetLogsResponse> {
  const url = getDeploymentUrl(deploymentName);
  const cursor = options?.cursor ?? 0;
  const limit = options?.limit ?? 50;

  // Build URL with query params - use stream_udf_execution for real-time logs
  const logsUrl = new URL(`${url}/api/stream_udf_execution`);
  logsUrl.searchParams.set("cursor", String(cursor));
  if (limit) logsUrl.searchParams.set("limit", String(limit));

  const response = await fetch(logsUrl.toString(), {
    method: "GET",
    headers: {
      Authorization: `Convex ${accessToken}`,
      "Content-Type": "application/json",
      "Convex-Client": CONVEX_CLIENT_ID,
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Failed to get logs: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const entries = data.entries || [];

  const logs: LogEntry[] = entries.map((entry: Record<string, unknown>) => {
    let timestamp = entry.timestamp as number;
    if (timestamp && timestamp < 1e12) {
      timestamp = timestamp * 1000;
    }

    const rawType = (entry.udf_type || entry.udfType || "query") as string;
    const functionType = rawType.toLowerCase() as
      | "query"
      | "mutation"
      | "action"
      | "http";

    const functionPath = (entry.identifier ||
      entry.udf_path ||
      "unknown") as string;

    let status: "success" | "failure" = "success";
    if (entry.error || entry.error_message) {
      status = "failure";
    } else if (entry.success === false) {
      status = "failure";
    }

    let executionTimeMs = 0;
    const execTime = entry.execution_time || entry.executionTime;
    if (typeof execTime === "number") {
      executionTimeMs = execTime < 100 ? execTime * 1000 : execTime;
    }

    const logLines: string[] = [];
    const rawLogLines = entry.logLines || entry.log_lines;
    if (Array.isArray(rawLogLines)) {
      for (const line of rawLogLines) {
        if (typeof line === "string") {
          logLines.push(line);
        } else if (Array.isArray(line)) {
          logLines.push(line.slice(1).join(" "));
        } else if (line && typeof line === "object") {
          logLines.push(JSON.stringify(line));
        }
      }
    }

    const usageStats = entry.usage_stats as Record<string, number> | undefined;
    const usage = {
      databaseReadBytes: usageStats?.database_read_bytes ?? 0,
      databaseWriteBytes: usageStats?.database_write_bytes ?? 0,
      storageReadBytes: usageStats?.storage_read_bytes ?? 0,
      storageWriteBytes: usageStats?.storage_write_bytes ?? 0,
      memoryUsedMb: usageStats?.memory_used_mb ?? 0,
    };

    const executionId = (entry.execution_id ||
      entry.executionId ||
      "") as string;
    const parentExecutionId = (entry.parent_execution_id ||
      entry.parentExecutionId ||
      null) as string | null;
    const caller = (entry.caller || undefined) as string | undefined;
    const environment = (entry.environment || undefined) as
      | "isolate"
      | "node"
      | undefined;
    const identityType = (entry.identity_type ||
      entry.identityType ||
      undefined) as string | undefined;

    return {
      id:
        executionId ||
        (entry.request_id as string) ||
        `${timestamp}-${functionPath}`,
      timestamp: timestamp || Date.now(),
      functionPath,
      functionType,
      status,
      executionTimeMs: Math.round(executionTimeMs),
      cached: Boolean(entry.cached_result || entry.cached),
      requestId: (entry.request_id || entry.execution_id || "") as string,
      executionId,
      parentExecutionId,
      errorMessage: (entry.error || entry.error_message) as string | undefined,
      logLines,
      caller,
      environment,
      identityType,
      usage,
      raw: entry,
    };
  });

  logs.sort((a, b) => b.timestamp - a.timestamp);

  return {
    logs,
    nextCursor: data.new_cursor || data.newCursor,
  };
}

/**
 * Format bytes for display
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[i]}`;
}

/**
 * Format execution time for display
 */
export function formatExecutionTime(ms: number): string {
  if (ms < 1) return "<1ms";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

/**
 * Format relative time for display
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 1000) return "just now";
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

// ============================================================================
// Function Call Tree
// ============================================================================

export interface ExecutionNode {
  executionId: string;
  functionName: string;
  startTime: number;
  executionTime?: number;
  status: "success" | "failure" | "running";
  parentExecutionId?: string | null;
  caller?: string;
  environment?: "isolate" | "node";
  identityType?: string;
  children: ExecutionNode[];
  error?: string;
  udfType: string;
  cached?: boolean;
}

/**
 * Build a tree of function calls from log entries
 */
export function buildFunctionCallTree(logs: LogEntry[]): ExecutionNode[] {
  const nodeMap = new Map<string, ExecutionNode>();
  const completedExecutions = new Set<string>();

  logs
    .filter((log) => log.status !== undefined && log.executionTimeMs > 0)
    .forEach((log) => {
      const node: ExecutionNode = {
        executionId: log.executionId,
        functionName: log.functionPath,
        startTime: log.timestamp - log.executionTimeMs,
        executionTime: log.executionTimeMs,
        status: log.status,
        parentExecutionId: log.parentExecutionId,
        caller: log.caller,
        environment: log.environment,
        identityType: log.identityType,
        children: [],
        error: log.errorMessage,
        udfType: log.functionType,
        cached: log.cached,
      };

      nodeMap.set(log.executionId, node);
      completedExecutions.add(log.executionId);
    });

  const executionLogMap = new Map<string, LogEntry[]>();
  logs.forEach((log) => {
    if (!executionLogMap.has(log.executionId)) {
      executionLogMap.set(log.executionId, []);
    }
    executionLogMap.get(log.executionId)!.push(log);
  });

  executionLogMap.forEach((logEntries, executionId) => {
    if (!completedExecutions.has(executionId)) {
      const firstLog = logEntries[0];
      const node: ExecutionNode = {
        executionId: firstLog.executionId,
        functionName: firstLog.functionPath,
        startTime: firstLog.timestamp,
        executionTime: undefined,
        status: "running",
        parentExecutionId: firstLog.parentExecutionId,
        caller: firstLog.caller,
        environment: firstLog.environment,
        identityType: firstLog.identityType,
        children: [],
        error: undefined,
        udfType: firstLog.functionType,
        cached: firstLog.cached,
      };

      nodeMap.set(executionId, node);
    }
  });

  const rootNodes: ExecutionNode[] = [];
  const allNodes = Array.from(nodeMap.values());

  allNodes.forEach((node) => {
    if (!node.parentExecutionId) {
      rootNodes.push(node);
    } else {
      const parent = nodeMap.get(node.parentExecutionId);
      if (parent) {
        parent.children.push(node);
      } else {
        rootNodes.push(node);
      }
    }
  });

  const sortChildren = (node: ExecutionNode) => {
    node.children.sort((a, b) => a.startTime - b.startTime);
    node.children.forEach(sortChildren);
  };

  rootNodes.sort((a, b) => a.startTime - b.startTime);
  rootNodes.forEach(sortChildren);

  return rootNodes;
}

/**
 * Get all logs for a specific request
 */
export function getLogsForRequest(
  logs: LogEntry[],
  requestId: string,
): LogEntry[] {
  return logs.filter((log) => log.requestId === requestId);
}

/**
 * Get the function call tree for functions called BY a specific execution
 * (i.e., only show children of this execution, not the whole request)
 */
export function getFunctionCallTreeForExecution(
  allLogs: LogEntry[],
  executionId: string,
): ExecutionNode[] {
  const requestLogs = allLogs.filter(
    (log) =>
      log.requestId ===
      allLogs.find((l) => l.executionId === executionId)?.requestId,
  );

  const fullTree = buildFunctionCallTree(requestLogs);

  const findNode = (nodes: ExecutionNode[]): ExecutionNode | null => {
    for (const node of nodes) {
      if (node.executionId === executionId) {
        return node;
      }
      const found = findNode(node.children);
      if (found) return found;
    }
    return null;
  };

  const node = findNode(fullTree);

  return node ? node.children : [];
}
