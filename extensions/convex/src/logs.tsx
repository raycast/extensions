/**
 * View Logs Command
 *
 * Stream and view function execution logs from your Convex deployment.
 * Shows real-time logs with details panel and filtering.
 */

import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useState } from "react";
import { useConvexAuth } from "./hooks/useConvexAuth";
import { useAuthenticatedListGuard } from "./components/AuthenticatedListGuard";
import {
  useLogs,
  useTeams,
  useProjects,
  useDeployments,
  useFunctions,
  type LogEntry,
} from "./hooks/useConvexData";
import {
  formatBytes,
  formatExecutionTime,
  getFunctionCallTreeForExecution,
  type ExecutionNode,
} from "./lib/api";

export default function ViewLogsCommand() {
  const { session, selectedContext } = useConvexAuth();
  const [functionFilter, setFunctionFilter] = useState<string | undefined>();
  const [requestFilter, setRequestFilter] = useState<string | undefined>();
  const [searchText, setSearchText] = useState("");
  const [showingDetail, setShowingDetail] = useState(false);
  const [expandedConsoleOutputs, setExpandedConsoleOutputs] = useState<
    Set<string>
  >(new Set());

  const accessToken = session?.accessToken ?? null;
  const deploymentName = selectedContext.deploymentName;

  const { data: teams } = useTeams(accessToken);
  const { data: projects } = useProjects(accessToken, selectedContext.teamId);
  const { data: deployments } = useDeployments(
    accessToken,
    selectedContext.projectId,
  );
  const { data: functions } = useFunctions(accessToken, deploymentName);

  const selectedTeam = teams?.find((t) => t.id === selectedContext.teamId);
  const selectedProject = projects?.find(
    (p) => p.id === selectedContext.projectId,
  );
  const selectedDeployment = deployments?.find(
    (d) => d.name === deploymentName,
  );

  const {
    logs,
    isLoading: logsLoading,
    isStreaming,
    toggleStreaming,
    refresh,
    clearLogs,
  } = useLogs(accessToken, deploymentName, {
    autoRefresh: true,
  });

  // Handle authentication
  const authGuard = useAuthenticatedListGuard(
    "Connect your Convex account to view logs",
  );
  if (authGuard) return authGuard;

  if (!deploymentName) {
    return (
      <List>
        <List.EmptyView
          title="No Deployment Selected"
          description="Use 'Manage Projects' to select a deployment first"
          icon={Icon.Cloud}
        />
      </List>
    );
  }

  const allFunctions = (functions ?? []).flatMap((module) =>
    module.functions.map((fn) => fn.identifier),
  );

  // Filter logs by both function filter and search text
  const filteredLogs = logs.filter((log) => {
    // Filter by request ID
    if (requestFilter && log.requestId !== requestFilter) {
      return false;
    }

    // Filter by function dropdown
    if (functionFilter) {
      // Normalize both to remove .js extension for comparison
      // Log: "dummyjson:getFirstFewTodos"
      // Filter: "dummyjson.js:getFirstFewTodos" -> "dummyjson:getFirstFewTodos"
      const normalizedLogPath = log.functionPath.replace(/\.js:/g, ":");
      const normalizedFilter = functionFilter.replace(/\.js:/g, ":");

      // If normalized paths don't match, exclude this log
      if (normalizedLogPath !== normalizedFilter) {
        return false;
      }
    }

    // Filter by search text (applies even if function filter is active)
    if (searchText) {
      const search = searchText.toLowerCase();
      return (
        log.functionPath.toLowerCase().includes(search) ||
        log.requestId.toLowerCase().includes(search) ||
        log.executionId.toLowerCase().includes(search) ||
        log.status.toLowerCase().includes(search) ||
        log.functionType.toLowerCase().includes(search)
      );
    }

    // No filters active, include the log
    return true;
  });

  const contextSubtitle =
    selectedProject && selectedDeployment
      ? `${selectedProject.name} / ${selectedDeployment.deploymentType}`
      : deploymentName;

  return (
    <List
      isLoading={logsLoading}
      isShowingDetail={showingDetail}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search logs..."
      navigationTitle="View Logs"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by function"
          value={functionFilter ?? "all"}
          onChange={(value) =>
            setFunctionFilter(value === "all" ? undefined : value)
          }
        >
          <List.Dropdown.Item title="All Functions" value="all" />
          <List.Dropdown.Section title="Functions">
            {allFunctions.map((fn) => (
              <List.Dropdown.Item key={fn} title={fn} value={fn} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      <List.Section
        title={contextSubtitle}
        subtitle={`${filteredLogs.length} log${filteredLogs.length !== 1 ? "s" : ""}${requestFilter ? " (filtered by request)" : ""}${isStreaming ? " (streaming)" : ""}`}
      >
        {filteredLogs.map((log) => {
          const isConsoleExpanded = expandedConsoleOutputs.has(log.id);
          const toggleConsoleOutput = () => {
            setExpandedConsoleOutputs((prev) => {
              const next = new Set(prev);
              if (next.has(log.id)) {
                next.delete(log.id);
              } else {
                next.add(log.id);
              }
              return next;
            });
          };

          return (
            <List.Item
              key={log.id}
              title={log.functionPath}
              subtitle={
                log.status === "failure" && log.errorMessage
                  ? truncateError(log.errorMessage, 80)
                  : undefined
              }
              icon={
                log.status === "failure"
                  ? { source: Icon.XMarkCircle, tintColor: Color.Red }
                  : undefined
              }
              keywords={[log.functionType, log.status, log.requestId]}
              accessories={getLogAccessories(log)}
              detail={
                <LogDetailPanel
                  log={log}
                  allLogs={logs}
                  showConsoleOutput={isConsoleExpanded}
                />
              }
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action
                      title={showingDetail ? "Hide Details" : "Show Details"}
                      icon={showingDetail ? Icon.EyeDisabled : Icon.Eye}
                      onAction={() => setShowingDetail(!showingDetail)}
                    />
                    {log.logLines.length > 0 && (
                      <Action
                        title={
                          isConsoleExpanded
                            ? "Hide Console Output"
                            : "Show Console Output"
                        }
                        icon={
                          isConsoleExpanded ? Icon.ChevronUp : Icon.ChevronDown
                        }
                        onAction={toggleConsoleOutput}
                        shortcut={{ modifiers: ["cmd"], key: "l" }}
                      />
                    )}
                    {requestFilter ? (
                      <Action
                        title="Clear Request Filter"
                        icon={Icon.XMarkCircle}
                        onAction={() => setRequestFilter(undefined)}
                        shortcut={{ modifiers: ["cmd"], key: "f" }}
                      />
                    ) : (
                      <Action
                        title="View Full Request"
                        icon={Icon.Link}
                        onAction={() => setRequestFilter(log.requestId)}
                        shortcut={{ modifiers: ["cmd"], key: "f" }}
                      />
                    )}
                    <Action.CopyToClipboard
                      title="Copy Request Id"
                      content={log.requestId}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    <Action.CopyToClipboard
                      title="Copy Execution Id"
                      content={log.executionId}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                    />
                    <Action.CopyToClipboard
                      title="Copy Full Log JSON"
                      content={JSON.stringify(log.raw, null, 2)}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    />
                    {log.errorMessage && (
                      <Action.CopyToClipboard
                        title="Copy Error Message"
                        content={log.errorMessage}
                        shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
                      />
                    )}
                  </ActionPanel.Section>

                  <ActionPanel.Section>
                    <Action
                      title={
                        isStreaming ? "Pause Streaming" : "Resume Streaming"
                      }
                      icon={isStreaming ? Icon.Pause : Icon.Play}
                      onAction={toggleStreaming}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                    />
                    <Action
                      title="Refresh Logs"
                      icon={Icon.ArrowClockwise}
                      onAction={async () => {
                        await refresh();
                        await showToast({
                          style: Toast.Style.Success,
                          title: "Logs refreshed",
                        });
                      }}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                    />
                    <Action
                      title="Clear Logs"
                      icon={Icon.Trash}
                      onAction={clearLogs}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section>
                    <Action.OpenInBrowser
                      title="Open Execution in Dashboard"
                      url={`https://dashboard.convex.dev/t/${selectedTeam?.slug}/${selectedProject?.slug}/${selectedDeployment?.deploymentType}/logs?request=${log.requestId}`}
                      shortcut={{ modifiers: ["cmd"], key: "o" }}
                    />
                    <Action.OpenInBrowser
                      title="Open Logs in Dashboard"
                      url={`https://dashboard.convex.dev/t/${selectedTeam?.slug}/${selectedProject?.slug}/${selectedDeployment?.deploymentType}/logs`}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      {filteredLogs.length === 0 && !logsLoading && (
        <List.EmptyView
          title="No Logs Found"
          description={
            functionFilter
              ? `No logs for function "${functionFilter}"\n\nTotal logs: ${logs.length}\nSample log paths: ${logs
                  .slice(0, 3)
                  .map((l) => l.functionPath)
                  .join(", ")}`
              : `No recent function executions\n\nTotal logs: ${logs.length}`
          }
          icon={Icon.Document}
          actions={
            <ActionPanel>
              <Action
                title={isStreaming ? "Pause Streaming" : "Resume Streaming"}
                icon={isStreaming ? Icon.Pause : Icon.Play}
                onAction={toggleStreaming}
              />
              <Action
                title="Refresh Logs"
                icon={Icon.ArrowClockwise}
                onAction={refresh}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

// Log detail panel component
interface LogDetailPanelProps {
  log: LogEntry;
  allLogs: LogEntry[];
  showConsoleOutput: boolean;
}

function LogDetailPanel({
  log,
  allLogs,
  showConsoleOutput,
}: LogDetailPanelProps) {
  // Build markdown content
  let markdown = "";

  // Error section (always show if error exists)
  if (log.status === "failure" && log.errorMessage) {
    markdown += `### Error\n\n`;
    markdown += `\`\`\`\n${log.errorMessage}\n\`\`\`\n\n`;
  }

  // Console output (only if exists and toggled on)
  if (log.logLines.length > 0 && showConsoleOutput) {
    markdown += `### Console Output\n\n`;
    markdown += `\`\`\`\n${log.logLines.join("\n")}\n\`\`\`\n\n`;
  }

  // Extract additional metadata from raw data
  const raw = log.raw as Record<string, unknown> | undefined;

  const usageStats = raw?.usageStats as Record<string, number> | undefined;
  const componentPath = raw?.componentPath as string | undefined;
  const returnBytes = raw?.returnBytes as number | undefined;
  const requestId = raw?.requestId as string | undefined;

  // Get functions called by this execution
  const functionsCalled = getFunctionCallTreeForExecution(
    allLogs,
    log.executionId,
  );

  return (
    <List.Item.Detail
      markdown={markdown || undefined}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Request ID"
            text={requestId}
            icon={Icon.Fingerprint}
          />

          <List.Item.Detail.Metadata.Label
            title="Execution ID"
            text={log.executionId}
          />

          {log.parentExecutionId && (
            <List.Item.Detail.Metadata.Label
              title="Parent Execution"
              text={log.parentExecutionId}
              icon={Icon.Link}
            />
          )}

          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label
            title="Function"
            text={log.functionPath}
          />

          {componentPath && (
            <List.Item.Detail.Metadata.Label
              title="Component"
              text={componentPath}
              icon={Icon.Box}
            />
          )}

          <List.Item.Detail.Metadata.Label
            title="Type"
            text={
              log.functionType.charAt(0).toUpperCase() +
              log.functionType.slice(1)
            }
          />

          <List.Item.Detail.Metadata.Label
            title="Status"
            text={`${log.status === "success" ? "Success" : "Failed"}${log.cached ? " (cached)" : ""}`}
          />

          {log.logLines.length > 0 && (
            <List.Item.Detail.Metadata.Label
              title="Console Output"
              text={
                showConsoleOutput
                  ? `${log.logLines.length} lines (press ⌘L to hide)`
                  : `${log.logLines.length} lines (press ⌘L to show)`
              }
              icon={showConsoleOutput ? Icon.ChevronUp : Icon.ChevronDown}
            />
          )}

          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label
            title="Started at"
            text={new Date(log.timestamp).toLocaleString()}
          />

          {!log.cached && (
            <List.Item.Detail.Metadata.Label
              title="Duration"
              text={formatExecutionTime(log.executionTimeMs)}
            />
          )}

          {log.identityType && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Identity"
                text={log.identityType}
                icon={Icon.Person}
              />
            </>
          )}

          {log.caller && (
            <List.Item.Detail.Metadata.Label title="Caller" text={log.caller} />
          )}

          {log.environment && (
            <List.Item.Detail.Metadata.Label
              title="Environment"
              text={log.environment}
              icon={Icon.Globe}
            />
          )}

          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label
            title="Compute"
            text={formatCompute(log.executionTimeMs, log.usage.memoryUsedMb)}
          />

          <List.Item.Detail.Metadata.Label
            title="DB Bandwidth"
            text={`Accessed ${formatDocumentCount(usageStats)}, ${formatBytes(log.usage.databaseReadBytes)} read, ${formatBytes(log.usage.databaseWriteBytes)} written`}
          />

          {(log.usage.storageReadBytes > 0 ||
            log.usage.storageWriteBytes > 0) && (
            <List.Item.Detail.Metadata.Label
              title="File Bandwidth"
              text={`${formatBytes(log.usage.storageReadBytes)} read, ${formatBytes(log.usage.storageWriteBytes)} written`}
            />
          )}

          {((usageStats?.vectorIndexReadBytes ?? 0) > 0 ||
            (usageStats?.vectorIndexWriteBytes ?? 0) > 0) && (
            <List.Item.Detail.Metadata.Label
              title="Vector Bandwidth"
              text={`${formatBytes(usageStats?.vectorIndexReadBytes ?? 0)} read, ${formatBytes(usageStats?.vectorIndexWriteBytes ?? 0)} written`}
              icon={Icon.Text}
            />
          )}

          {returnBytes !== undefined && (
            <List.Item.Detail.Metadata.Label
              title="Return Size"
              text={formatBytes(returnBytes)}
              icon={Icon.Download}
            />
          )}

          {functionsCalled.length > 0 && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Functions Called"
                text={`${functionsCalled.length} function${functionsCalled.length !== 1 ? "s" : ""}`}
              />
              {functionsCalled.map((node, idx) => (
                <FunctionCallMetadataItem key={idx} node={node} level={0} />
              ))}
            </>
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

// Component to render a function call tree node in metadata
function FunctionCallMetadataItem({
  node,
  level,
}: {
  node: ExecutionNode;
  level: number;
}) {
  const indent = level > 0 ? "    ".repeat(level) : "";
  const icon =
    node.status === "running"
      ? Icon.CircleProgress
      : node.error
        ? Icon.XMarkCircle
        : Icon.CheckCircle;

  const color =
    node.status === "running"
      ? Color.Blue
      : node.error
        ? Color.Red
        : Color.Green;

  const timing = node.executionTime
    ? formatExecutionTime(node.executionTime)
    : node.status === "running"
      ? "running..."
      : "";

  const cached = node.cached ? " • cached" : "";
  const displayText = timing || cached ? `${timing}${cached}` : undefined;

  return (
    <>
      <List.Item.Detail.Metadata.Label
        title={`${indent}${node.functionName}`}
        text={displayText}
        icon={{ source: icon, tintColor: color }}
      />
      {node.children.map((child, idx) => (
        <FunctionCallMetadataItem key={idx} node={child} level={level + 1} />
      ))}
    </>
  );
}

function getLogAccessories(log: LogEntry): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];

  // Execution time (like Convex dashboard - simple text with clock icon)
  if (log.status === "failure") {
    // Don't show execution time for failures
  } else if (log.cached) {
    accessories.push({
      text: "cached",
      icon: Icon.Clock,
      tooltip: "Result from cache",
    });
  } else {
    accessories.push({
      text: formatExecutionTime(log.executionTimeMs),
      icon: Icon.Clock,
      tooltip: `Execution time: ${formatExecutionTime(log.executionTimeMs)}`,
    });
  }

  // Function type - plain text like Convex dashboard
  accessories.push({
    text: log.functionType.charAt(0).toUpperCase() + log.functionType.slice(1),
    tooltip: `Function type: ${log.functionType}`,
  });

  // Relative timestamp
  accessories.push({
    date: new Date(log.timestamp),
    tooltip: new Date(log.timestamp).toLocaleString(),
  });

  return accessories;
}

function truncateError(error: string, maxLength: number): string {
  if (error.length <= maxLength) return error;
  return (
    error.substring(0, maxLength) + "\n... (copy full error with Cmd+Opt+C)"
  );
}

// Helper to format document count from raw log
function formatDocumentCount(
  usageStats: Record<string, number> | undefined,
): string {
  const reads = (usageStats?.databaseReadDocuments as number) || 0;
  const writes = (usageStats?.databaseWriteDocuments as number) || 0;

  if (reads === 0 && writes === 0) return "0 documents";

  return `${reads + writes} document${reads + writes !== 1 ? "s" : ""}`;
}

// Helper to format compute usage
function formatCompute(executionTimeMs: number, memoryMb: number): string {
  const executionTimeS = executionTimeMs / 1000;
  const gbHr = (memoryMb / 1024) * (executionTimeS / 3600);
  return `${gbHr.toFixed(7)} GB-hr (${memoryMb.toFixed(0)} MB for ${executionTimeS.toFixed(2)}s)`;
}
