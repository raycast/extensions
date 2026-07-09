import { Color, Icon } from "@raycast/api";
import { WorkflowInfo, WorkflowStatus, WORKFLOW_STATUS_CONFIG } from "./types";
import { getCurrentCluster, getCurrentNamespace } from "./temporal-client";

/**
 * Format a duration in milliseconds to a human-readable string
 */
export function formatDuration(ms: number): string {
  if (ms < 0) return "0ms";

  // Handle sub-second durations
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  }
  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }
  if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }
  return `${seconds}s`;
}

/**
 * Calculate and format workflow duration
 */
export function getWorkflowDuration(workflow: WorkflowInfo): string {
  const endTime = workflow.closeTime || new Date();
  const duration = endTime.getTime() - workflow.startTime.getTime();
  return formatDuration(duration);
}

/**
 * Format a date to a relative time string (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 7) {
    return date.toLocaleDateString();
  }
  if (diffDays > 0) {
    return `${diffDays}d ago`;
  }
  if (diffHours > 0) {
    return `${diffHours}h ago`;
  }
  if (diffMinutes > 0) {
    return `${diffMinutes}m ago`;
  }
  return "just now";
}

/**
 * Format a date to a full datetime string
 */
export function formatDateTime(date: Date): string {
  return date.toLocaleString();
}

/**
 * Get the icon for a workflow status
 */
export function getStatusIcon(status: WorkflowStatus): Icon {
  return WORKFLOW_STATUS_CONFIG[status]?.icon ?? Icon.QuestionMark;
}

/**
 * Get the color for a workflow status
 */
export function getStatusColor(status: WorkflowStatus): Color {
  return WORKFLOW_STATUS_CONFIG[status]?.color ?? Color.SecondaryText;
}

/**
 * Get the label for a workflow status
 */
export function getStatusLabel(status: WorkflowStatus): string {
  return WORKFLOW_STATUS_CONFIG[status]?.label ?? status;
}

/**
 * Build a Temporal visibility query from search text and filters
 */
export function buildSearchQuery(searchText?: string, statusFilter?: string): string | undefined {
  const conditions: string[] = [];

  if (searchText && searchText.trim()) {
    const trimmed = searchText.trim();
    // Always search both WorkflowId and WorkflowType so users can find workflows
    // regardless of whether the search term looks like an ID or a type name
    conditions.push(`(WorkflowId = '${escapeQueryValue(trimmed)}' OR WorkflowType = '${escapeQueryValue(trimmed)}')`);
  }

  if (statusFilter && statusFilter !== "all") {
    conditions.push(`ExecutionStatus = '${statusFilter}'`);
  }

  return conditions.length > 0 ? conditions.join(" AND ") : undefined;
}

/**
 * Escape a value for use in a Temporal visibility query
 */
function escapeQueryValue(value: string): string {
  return value.replace(/'/g, "''");
}

/**
 * Build a URL to the Temporal UI for a workflow
 * Uses the current cluster's webUiUrl and namespace
 */
export function buildTemporalUiUrl(workflowId: string, runId?: string): string | undefined {
  const cluster = getCurrentCluster();
  if (!cluster.webUiUrl) return undefined;

  const baseUrl = cluster.webUiUrl.replace(/\/$/, "");
  const namespace = getCurrentNamespace();

  // Format: {baseUrl}/namespaces/{namespace}/workflows/{workflowId}/{runId}
  let url = `${baseUrl}/namespaces/${encodeURIComponent(namespace)}/workflows/${encodeURIComponent(workflowId)}`;
  if (runId) {
    url += `/${encodeURIComponent(runId)}`;
  }

  return url;
}

/**
 * Truncate a string to a maximum length with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}
