import { getCurrentNamespace, getCurrentCluster } from "./temporal-client";

/**
 * Generate temporal CLI commands for workflows
 *
 * For non-local clusters, includes --address flag
 */

/**
 * Escape a value for use in a double-quoted shell argument
 */
function escapeShellArg(value: string): string {
  // Escape backslashes first, then double quotes
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * Get the address flag if not using localhost
 */
function getAddressFlag(): string {
  const cluster = getCurrentCluster();
  const address = cluster.address;

  // Skip address flag for localhost
  if (address.startsWith("localhost") || address.startsWith("127.0.0.1")) {
    return "";
  }

  // Include address flag for remote servers (including Temporal Cloud)
  return ` --address "${escapeShellArg(address)}"`;
}

export function getDescribeCommand(workflowId: string, runId?: string): string {
  const namespace = getCurrentNamespace();
  const addressFlag = getAddressFlag();
  let cmd = `temporal workflow describe --workflow-id "${escapeShellArg(workflowId)}"`;
  if (runId) {
    cmd += ` --run-id "${escapeShellArg(runId)}"`;
  }
  cmd += ` --namespace "${escapeShellArg(namespace)}"`;
  cmd += addressFlag;
  return cmd;
}

export function getCancelCommand(workflowId: string, runId?: string): string {
  const namespace = getCurrentNamespace();
  const addressFlag = getAddressFlag();
  let cmd = `temporal workflow cancel --workflow-id "${escapeShellArg(workflowId)}"`;
  if (runId) {
    cmd += ` --run-id "${escapeShellArg(runId)}"`;
  }
  cmd += ` --namespace "${escapeShellArg(namespace)}"`;
  cmd += addressFlag;
  return cmd;
}

export function getTerminateCommand(workflowId: string, reason?: string, runId?: string): string {
  const namespace = getCurrentNamespace();
  const addressFlag = getAddressFlag();
  let cmd = `temporal workflow terminate --workflow-id "${escapeShellArg(workflowId)}"`;
  if (runId) {
    cmd += ` --run-id "${escapeShellArg(runId)}"`;
  }
  if (reason) {
    cmd += ` --reason "${escapeShellArg(reason)}"`;
  }
  cmd += ` --namespace "${escapeShellArg(namespace)}"`;
  cmd += addressFlag;
  return cmd;
}

export function getSignalCommand(workflowId: string, signalName?: string, runId?: string): string {
  const namespace = getCurrentNamespace();
  const addressFlag = getAddressFlag();
  let cmd = `temporal workflow signal --workflow-id "${escapeShellArg(workflowId)}"`;
  if (runId) {
    cmd += ` --run-id "${escapeShellArg(runId)}"`;
  }
  cmd += ` --name "${escapeShellArg(signalName || "SIGNAL_NAME")}"`;
  cmd += ` --namespace "${escapeShellArg(namespace)}"`;
  cmd += addressFlag;
  // User can add: --input '{"key": "value"}'
  return cmd;
}

export function getQueryCommand(workflowId: string, queryType?: string, runId?: string): string {
  const namespace = getCurrentNamespace();
  const addressFlag = getAddressFlag();
  let cmd = `temporal workflow query --workflow-id "${escapeShellArg(workflowId)}"`;
  if (runId) {
    cmd += ` --run-id "${escapeShellArg(runId)}"`;
  }
  cmd += ` --type "${escapeShellArg(queryType || "QUERY_TYPE")}"`;
  cmd += ` --namespace "${escapeShellArg(namespace)}"`;
  cmd += addressFlag;
  return cmd;
}

export function getResetCommand(workflowId: string, eventId: number, runId?: string): string {
  const namespace = getCurrentNamespace();
  const addressFlag = getAddressFlag();
  let cmd = `temporal workflow reset --workflow-id "${escapeShellArg(workflowId)}"`;
  if (runId) {
    cmd += ` --run-id "${escapeShellArg(runId)}"`;
  }
  cmd += ` --event-id ${eventId}`;
  cmd += ` --namespace "${escapeShellArg(namespace)}"`;
  cmd += addressFlag;
  return cmd;
}

export function getShowCommand(workflowId: string, runId?: string): string {
  const namespace = getCurrentNamespace();
  const addressFlag = getAddressFlag();
  let cmd = `temporal workflow show --workflow-id "${escapeShellArg(workflowId)}"`;
  if (runId) {
    cmd += ` --run-id "${escapeShellArg(runId)}"`;
  }
  cmd += ` --namespace "${escapeShellArg(namespace)}"`;
  cmd += addressFlag;
  return cmd;
}

export function getListCommand(query?: string): string {
  const namespace = getCurrentNamespace();
  const addressFlag = getAddressFlag();
  let cmd = `temporal workflow list --namespace "${escapeShellArg(namespace)}"`;
  if (query) {
    cmd += ` --query "${escapeShellArg(query)}"`;
  }
  cmd += addressFlag;
  return cmd;
}
