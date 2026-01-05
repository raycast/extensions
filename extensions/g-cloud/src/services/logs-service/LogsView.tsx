import { ActionPanel, Action, List, showToast, Toast, Icon, Color, Detail, useNavigation } from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { listLogEntries, LogEntry, LogSeverity, LOG_RESOURCE_TYPES } from "../../utils/gcpApi";
import { initializeQuickLink } from "../../utils/QuickLinks";
import { ApiErrorView } from "../../components/ApiErrorView";

interface LogsViewProps {
  projectId: string;
  gcloudPath: string;
  initialResourceType?: string;
}

const SEVERITY_LEVELS: { value: LogSeverity | ""; label: string; color: Color; icon: Icon }[] = [
  { value: "", label: "All Levels", color: Color.SecondaryText, icon: Icon.List },
  { value: "DEBUG", label: "Debug", color: Color.SecondaryText, icon: Icon.Bug },
  { value: "INFO", label: "Info", color: Color.Green, icon: Icon.Info },
  { value: "NOTICE", label: "Notice", color: Color.Blue, icon: Icon.Bell },
  { value: "WARNING", label: "Warning", color: Color.Yellow, icon: Icon.ExclamationMark },
  { value: "ERROR", label: "Error", color: Color.Red, icon: Icon.XMarkCircle },
  { value: "CRITICAL", label: "Critical", color: Color.Purple, icon: Icon.Warning },
];

export default function LogsView({ projectId, gcloudPath, initialResourceType }: LogsViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [severity, setSeverity] = useState<LogSeverity | "">("");
  const [resourceType, setResourceType] = useState<string>(initialResourceType || "");
  const [searchText, setSearchText] = useState<string>("");
  const { push } = useNavigation();

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await listLogEntries(gcloudPath, projectId, {
        severity: severity || undefined,
        resourceType: resourceType || undefined,
        filter: searchText ? `textPayload=~"${searchText}" OR jsonPayload.message=~"${searchText}"` : undefined,
        pageSize: 100,
      });

      setLogs(response.entries || []);

      const count = response.entries?.length || 0;
      showToast({
        style: Toast.Style.Success,
        title: "Logs loaded",
        message: `Found ${count} log entries`,
      });
    } catch (err) {
      console.error("Error fetching logs:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch logs");
    } finally {
      setIsLoading(false);
    }
  }, [gcloudPath, projectId, severity, resourceType, searchText]);

  useEffect(() => {
    initializeQuickLink(projectId);
  }, [projectId]);

  useEffect(() => {
    fetchLogs();
  }, [severity, resourceType]);

  function getSeverityIcon(sev?: LogSeverity): { source: Icon; tintColor: Color } {
    switch (sev) {
      case "DEBUG":
        return { source: Icon.Bug, tintColor: Color.SecondaryText };
      case "INFO":
        return { source: Icon.Info, tintColor: Color.Green };
      case "NOTICE":
        return { source: Icon.Bell, tintColor: Color.Blue };
      case "WARNING":
        return { source: Icon.ExclamationMark, tintColor: Color.Yellow };
      case "ERROR":
        return { source: Icon.XMarkCircle, tintColor: Color.Red };
      case "CRITICAL":
      case "ALERT":
      case "EMERGENCY":
        return { source: Icon.Warning, tintColor: Color.Purple };
      default:
        return { source: Icon.Dot, tintColor: Color.SecondaryText };
    }
  }

  function truncate(text: string, maxLen: number = 50): string {
    // Remove newlines and extra whitespace, then truncate
    const clean = text.replace(/\s+/g, " ").trim();
    return clean.length > maxLen ? clean.slice(0, maxLen) + "..." : clean;
  }

  function getLogMessage(entry: LogEntry): string {
    if (entry.textPayload) {
      return truncate(entry.textPayload);
    }

    if (entry.jsonPayload) {
      // Try common message fields
      const msg =
        entry.jsonPayload.message ||
        entry.jsonPayload.msg ||
        entry.jsonPayload.text ||
        entry.jsonPayload.error ||
        entry.jsonPayload.description ||
        entry.jsonPayload.status;

      if (msg && typeof msg === "string") {
        return truncate(msg);
      }

      // Fallback to stringified JSON (but make it more readable)
      const json = JSON.stringify(entry.jsonPayload);
      if (json !== "{}") {
        return truncate(json);
      }
    }

    if (entry.protoPayload) {
      const proto = entry.protoPayload as { methodName?: string; serviceName?: string; status?: { message?: string } };
      if (proto.methodName) {
        return truncate(`Method: ${proto.methodName}`);
      }
      if (proto.status?.message) {
        return truncate(proto.status.message);
      }
      const json = JSON.stringify(entry.protoPayload);
      if (json !== "{}") {
        return truncate(json);
      }
    }

    // Try to show something useful from httpRequest if available
    if (entry.httpRequest) {
      const { requestMethod, requestUrl, status } = entry.httpRequest;
      if (requestMethod || requestUrl) {
        return truncate(`${requestMethod || "REQUEST"} ${requestUrl || ""} ${status ? `(${status})` : ""}`);
      }
    }

    // Last resort: show log name
    const logName = entry.logName.split("/").pop();
    if (logName) {
      return truncate(`Log: ${logName}`);
    }

    return "Empty log entry";
  }

  function formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  }

  function formatFullTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleString();
  }

  function viewLogDetails(entry: LogEntry) {
    const markdown = `# Log Entry

## Metadata
- **Timestamp:** ${formatFullTimestamp(entry.timestamp)}
- **Severity:** ${entry.severity || "DEFAULT"}
- **Resource Type:** ${entry.resource.type}
- **Log Name:** \`${entry.logName.split("/").pop()}\`

${entry.trace ? `- **Trace:** \`${entry.trace}\`` : ""}
${entry.spanId ? `- **Span ID:** \`${entry.spanId}\`` : ""}

## Resource Labels
${Object.entries(entry.resource.labels)
  .map(([k, v]) => `- **${k}:** ${v}`)
  .join("\n")}

${
  entry.labels && Object.keys(entry.labels).length > 0
    ? `## Labels
${Object.entries(entry.labels)
  .map(([k, v]) => `- **${k}:** ${v}`)
  .join("\n")}`
    : ""
}

${
  entry.httpRequest
    ? `## HTTP Request
- **Method:** ${entry.httpRequest.requestMethod || "N/A"}
- **URL:** ${entry.httpRequest.requestUrl || "N/A"}
- **Status:** ${entry.httpRequest.status || "N/A"}
- **Remote IP:** ${entry.httpRequest.remoteIp || "N/A"}
- **Latency:** ${entry.httpRequest.latency || "N/A"}`
    : ""
}

${
  entry.sourceLocation
    ? `## Source Location
- **File:** ${entry.sourceLocation.file || "N/A"}
- **Line:** ${entry.sourceLocation.line || "N/A"}
- **Function:** ${entry.sourceLocation.function || "N/A"}`
    : ""
}

## Payload
\`\`\`json
${JSON.stringify(entry.textPayload || entry.jsonPayload || entry.protoPayload || {}, null, 2)}
\`\`\`
`;

    push(<Detail markdown={markdown} navigationTitle="Log Entry" />);
  }

  function handleSearchSubmit() {
    fetchLogs();
  }

  if (error) {
    return (
      <List>
        <ApiErrorView error={error} projectId={projectId} apiName="logging" onRetry={fetchLogs} />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search logs... (press Enter to search)"
      navigationTitle={`Logs - ${projectId}`}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Severity"
          value={severity}
          onChange={(value) => setSeverity(value as LogSeverity | "")}
        >
          {SEVERITY_LEVELS.map((level) => (
            <List.Dropdown.Item
              key={level.value || "all"}
              title={level.label}
              value={level.value}
              icon={{ source: level.icon, tintColor: level.color }}
            />
          ))}
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          <Action title="Search" icon={Icon.MagnifyingGlass} onAction={handleSearchSubmit} />
          <Action title="Refresh" icon={Icon.RotateClockwise} onAction={fetchLogs} />
          <ActionPanel.Submenu
            title={`Resource: ${resourceType ? LOG_RESOURCE_TYPES.find((r) => r.value === resourceType)?.label || resourceType : "All"}`}
            icon={Icon.Filter}
          >
            {LOG_RESOURCE_TYPES.map((type) => (
              <Action
                key={type.value || "all-resources"}
                title={type.label}
                icon={resourceType === type.value ? Icon.CheckCircle : Icon.Circle}
                onAction={() => setResourceType(type.value)}
              />
            ))}
          </ActionPanel.Submenu>
          <Action.OpenInBrowser
            title="Open in Cloud Console"
            url={`https://console.cloud.google.com/logs/query?project=${projectId}`}
          />
        </ActionPanel>
      }
    >
      {logs.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Logs Found"
          description={severity ? `No logs with severity ${severity} or higher` : "No logs in the selected time range"}
          icon={{ source: Icon.Document }}
          actions={
            <ActionPanel>
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={fetchLogs} />
              <Action.OpenInBrowser
                title="Open in Cloud Console"
                url={`https://console.cloud.google.com/logs/query?project=${projectId}`}
              />
            </ActionPanel>
          }
        />
      ) : (
        logs.map((entry, index) => {
          const message = getLogMessage(entry);
          const severityIcon = getSeverityIcon(entry.severity);
          const resourceLabel = entry.resource.type.replace(/_/g, " ");

          return (
            <List.Item
              key={entry.insertId || `${entry.timestamp}-${index}`}
              title={message}
              subtitle={resourceLabel}
              icon={severityIcon}
              accessories={[
                { tag: { value: entry.severity || "DEFAULT", color: severityIcon.tintColor } },
                { text: formatTimestamp(entry.timestamp), tooltip: formatFullTimestamp(entry.timestamp) },
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Log Actions">
                    <Action title="View Details" icon={Icon.Eye} onAction={() => viewLogDetails(entry)} />
                    <Action.CopyToClipboard
                      title="Copy Message"
                      content={message}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    <Action.CopyToClipboard
                      title="Copy Full Entry"
                      content={JSON.stringify(entry, null, 2)}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Filters">
                    <Action
                      title={`Filter by ${entry.resource.type.replace(/_/g, " ")}`}
                      icon={Icon.Filter}
                      onAction={() => setResourceType(entry.resource.type)}
                    />
                    <ActionPanel.Submenu
                      title={`Resource: ${resourceType ? LOG_RESOURCE_TYPES.find((r) => r.value === resourceType)?.label || resourceType : "All"}`}
                      icon={Icon.Filter}
                    >
                      {LOG_RESOURCE_TYPES.map((type) => (
                        <Action
                          key={type.value || "all-resources"}
                          title={type.label}
                          icon={resourceType === type.value ? Icon.CheckCircle : Icon.Circle}
                          onAction={() => setResourceType(type.value)}
                        />
                      ))}
                    </ActionPanel.Submenu>
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action title="Refresh" icon={Icon.RotateClockwise} onAction={fetchLogs} />
                    <Action.OpenInBrowser
                      title="Open in Cloud Console"
                      url={`https://console.cloud.google.com/logs/query?project=${projectId}`}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
