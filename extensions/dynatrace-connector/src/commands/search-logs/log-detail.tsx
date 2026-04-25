// log-detail-view.tsx
import {
  Detail,
  ActionPanel,
  Action,
  getPreferenceValues,
  Color,
  useNavigation,
  Icon,
  AI,
  environment,
  showToast,
  Toast,
  LocalStorage,
  open,
} from "@raycast/api";
import { LogRecord } from "../../lib/types/log";
import type { TenantConfig } from "../../lib/auth";
import { formatLogContent } from "../../lib/utils/formatLogContent";
import { JiraIssueForm } from "../../components/JiraIssueForm";
import { JiraIssueResult } from "../../components/JiraIssueResult";

interface ExtensionPrefs {
  dynatraceEndpoint: string;
  jiraUrl?: string;
  jiraEmail?: string;
  jiraApiToken?: string;
  jiraProjectKey?: string;
}

/** Returns the string value if non-empty, or undefined to signal "hide this field". */
function val(v: unknown): string | undefined {
  if (v == null || v === "" || v === "N/A") return undefined;
  return String(v);
}

/**
 * Builds a Dynatrace Logs deep-link (used only for Jira integration).
 */
function buildLogsUrl(baseUrl: string): string {
  // Ensure baseUrl has https:// protocol
  let url = baseUrl;
  if (!url) {
    return ""; // Empty URL if no baseUrl configured
  }
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }

  // Use 24h timeframe for context
  return `${url}/ui/apps/dynatrace.logs?gtf=last_24h`;
}

/**
 * Builds a ready-to-paste DQL query that finds related logs.
 * Does NOT include timestamp filters — user should set timeframe in the DQL runner form.
 * Filters by service, app, or process name only.
 */
function buildDqlFilter(log: LogRecord): string {
  const conditions: string[] = [];

  // Add service/app/process filter - try in order of preference
  const service = log["service.name"] ? String(log["service.name"]) : undefined;
  if (service) {
    conditions.push(`service.name == "${service}"`);
  } else {
    const appName = log["dt.app.name"] ? String(log["dt.app.name"]) : undefined;
    if (appName) {
      conditions.push(`dt.app.name == "${appName}"`);
    } else {
      // Fall back to process name if available
      const processName = log["dt.process.name"]
        ? String(log["dt.process.name"])
        : log["dt.process_group.detected_name"]
          ? String(log["dt.process_group.detected_name"])
          : undefined;
      if (processName) {
        conditions.push(`dt.process.name == "${processName}"`);
      }
    }
  }

  // If we have conditions, add them; otherwise just fetch all logs
  if (conditions.length > 0) {
    return `fetch logs\n| filter ${conditions.join("\n    and ")}\n| limit 100`;
  } else {
    return `fetch logs\n| limit 100`;
  }
}

/**
 * Converts an ISO timestamp to nanosecond precision (9 decimal digits).
 * Dynatrace Distributed Tracing Explorer requires the `tt` param in this format.
 *
 * Input:  "2026-04-13T04:22:58.073Z"
 * Output: "2026-04-13T04:22:58.073000000Z"
 */
function toNanoIso(timestamp: string): string {
  const iso = new Date(timestamp).toISOString();
  const base = iso.replace(/Z$/, "");
  const dotIdx = base.lastIndexOf(".");
  if (dotIdx === -1) return `${base}.000000000Z`;
  const fraction = base.slice(dotIdx + 1);
  const padded = fraction.padEnd(9, "0").slice(0, 9);
  return `${base.slice(0, dotIdx)}.${padded}Z`;
}

/**
 * Builds a Dynatrace Distributed Tracing Explorer deep-link.
 * /ui/apps/dynatrace.distributedtracing/explorer?traceId=…&spanId=…&tt=…&m=true&…
 */
function buildTraceUrl(baseUrl: string, traceId: string, spanId: string | undefined, timestamp: string): string {
  const params = new URLSearchParams({
    traceId,
    tt: toNanoIso(timestamp),
    m: "true",
    cv: "a,false",
    sidebar: "a,false",
    pf: "true",
  });
  if (spanId) params.set("spanId", spanId);
  return `${baseUrl}/ui/apps/dynatrace.distributedtracing/explorer?${params.toString()}`;
}

/** Normalises process.technology / dt.openpipeline.pipelines — always returns a string. */
function valArray(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (Array.isArray(v)) {
    const joined = v.filter(Boolean).join(", ");
    return joined || undefined;
  }
  return val(v);
}

/** Normalises any field value to a string[] for TagList rendering. */
function toArray(v: unknown): string[] {
  if (v == null) return [];
  if (Array.isArray(v)) return v.filter(Boolean).map(String);
  const s = String(v).trim();
  return s ? [s] : [];
}

/**
 * Maps log level + status to a Raycast tag Color.
 * INFO stays gray (Color.SecondaryText) per design.
 */
function levelColor(level: string | undefined, status: string | undefined): Color {
  const st = status?.toUpperCase();
  if (st === "SUCCESS") return Color.Green;
  if (st === "ERROR" || st === "FAILED" || st === "FAILURE") return Color.Red;
  switch (level?.toUpperCase()) {
    case "WARN":
    case "WARNING":
      return Color.Yellow;
    case "ERROR":
    case "FATAL":
    case "CRITICAL":
      return Color.Red;
    default:
      return Color.SecondaryText; // INFO, DEBUG — neutral gray
  }
}

/**
 * Simple detail view to display AI analysis result
 */
function AIAnalysisDetail({ content }: { content: string }) {
  return (
    <Detail
      markdown={content}
      navigationTitle="AI Analysis"
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Analysis" content={content} />
        </ActionPanel>
      }
    />
  );
}

export default function LogDetailView({ log, tenant }: { log: LogRecord; tenant?: TenantConfig }) {
  try {
    const { push } = useNavigation();
    const prefs = getPreferenceValues<ExtensionPrefs>();

    // Use tenant endpoint if available, fall back to preferences
    const baseUrl = (tenant?.tenantEndpoint || prefs.dynatraceEndpoint)?.replace(/\/$/, "") ?? "";
    const logsUrl = buildLogsUrl(baseUrl);
    const hasJiraConfig = !!(prefs.jiraUrl && prefs.jiraEmail && prefs.jiraApiToken && prefs.jiraProjectKey);

    // ── Field values (undefined → hide) ───────────────────────────────────────

    // Log info
    const loglevel = val(log.loglevel);
    const status = val(log.status);
    const eventType = val(log["event.type"]);

    // Service / App
    const serviceName = val(log["service.name"]);
    const appName = val(log["dt.app.name"]);
    const appVersion = val(log["dt.app.version"]);

    // Infrastructure
    const hostName = val(log["host.name"]);
    const hostGroup = val(log["dt.host_group.id"]);

    // AWS
    const awsRegion = val(log["aws.region"]);
    const awsAz = val(log["aws.availability_zone"]);
    const awsAccount = val(log["aws.account.id"]);
    const awsArn = val(log["aws.arn"]);

    // Kubernetes
    const k8sCluster = val(log["k8s.cluster.name"]);
    const k8sNamespace = val(log["k8s.namespace.name"]);
    const k8sNode = val(log["k8s.node.name"]);

    // Process
    const processName = val(log["dt.process.name"]) ?? val(log["dt.process_group.detected_name"]);
    const processTech = valArray(log["process.technology"]);
    const logSource = val(log["log.source"]);
    const operatorVersion = val(log["OperatorVersion"]);

    // Pipeline
    const pipelineSource = val(log["dt.openpipeline.source"]);
    const pipelines = valArray(log["dt.openpipeline.pipelines"]);

    // Telemetry
    const traceId = val(log.trace_id);
    const spanId = val(log.span_id);

    // Trace URL — only built when traceId is present
    const traceUrl = traceId ? buildTraceUrl(baseUrl, traceId, spanId, log.timestamp) : undefined;

    // DQL filter — used in markdown preview and Copy action
    const dqlFilter = buildDqlFilter(log);

    const hasServiceInfo = !!(
      serviceName ||
      appName ||
      appVersion ||
      processName ||
      processTech ||
      logSource ||
      operatorVersion
    );
    const hasInfraInfo = !!(hostName || hostGroup || awsRegion || awsAz || awsAccount || awsArn);
    const hasK8sInfo = !!(k8sCluster || k8sNamespace || k8sNode);
    const hasPipelineInfo = !!(pipelineSource || pipelines);
    const hasTelemetry = !!(traceId || spanId);

    // ── Markdown ──────────────────────────────────────────────────────────────

    // Status header: badge-style code spans for level / status / event type + timestamp
    const badgeParts: string[] = [];
    if (loglevel) badgeParts.push(`\`${loglevel}\``);
    if (status && status !== loglevel) badgeParts.push(`\`${status}\``);
    if (eventType) badgeParts.push(`\`${eventType}\``);
    if (log.timestamp) {
      const d = new Date(log.timestamp);
      const dateStr = d
        .toISOString()
        .replace("T", "  ·  ")
        .replace(/\.\d+Z$/, " UTC");
      badgeParts.push(dateStr);
    }
    const statusHeader = badgeParts.join("  ·  ");

    // Long IDs section — values that get truncated in the narrow metadata sidebar
    const longIds: string[] = [];
    if (awsArn) longIds.push(`**AWS ARN**\n\`${awsArn}\``);
    const podUid = val(log["k8s.pod.uid"]);
    if (podUid) longIds.push(`**K8s Pod UID**\n\`${podUid}\``);

    // Format log content: pretty-print JSON, format stack traces, or display as-is
    const formattedContent = log.content ? formatLogContent(log.content) : "No content available";

    const markdown = [
      statusHeader,
      "---",
      "## Log Content",
      formattedContent,
      "---",
      "**DQL Filter** *(⌘D to copy)*",
      `\`\`\`\n${dqlFilter}\n\`\`\``,
      ...(longIds.length > 0 ? ["---", ...longIds] : []),
    ].join("\n\n");

    // Handle "Run DQL" — opens DQL runner with pre-filled query and custom timeframe
    const handleRunDql = async () => {
      try {
        const ts = new Date(log.timestamp).getTime();
        // Create custom date range: ±5 minutes around the log timestamp
        const from = new Date(ts - 5 * 60_000).toISOString(); // -5 minutes
        const to = new Date(ts + 5 * 60_000).toISOString(); // +5 minutes

        const preset = {
          dql: dqlFilter,
          timeframeCustomFrom: from,
          timeframeCustomTo: to,
          timeframePreset: "custom",
        };

        // Store DQL and timeframe in localStorage so dql-runner can pick it up
        await LocalStorage.setItem("dql-runner-preset", JSON.stringify(preset));

        // Open DQL runner command
        await open("raycast://extensions/one-developer-corporation/dynatrace-connector/dt-dql-runner");
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to open DQL Runner",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    };

    return (
      <Detail
        navigationTitle={`${serviceName ?? appName ?? processName ?? "Unknown"} — ${loglevel ?? "?"}`}
        markdown={markdown}
        actions={
          <ActionPanel>
            {/* Primary: Run DQL Query in DQL Runner — pre-fills query and timeframe */}
            <Action
              title="Run DQL Query"
              icon={Icon.Play}
              onAction={handleRunDql}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />

            {/* Secondary: Open in Trace Explorer if available */}
            {traceUrl && (
              <Action.OpenInBrowser
                title="Open in Distributed Traces"
                url={traceUrl}
                shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
              />
            )}
            {/* Copy DQL filter — paste into DT Logs search bar */}
            <Action.CopyToClipboard
              title="Copy DQL Filter"
              content={dqlFilter}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
            />
            <Action.CopyToClipboard title="Copy Log Content" content={log.content ?? ""} />
            <Action.CopyToClipboard title="Copy Timestamp" content={log.timestamp ?? ""} />
            {traceUrl && <Action.CopyToClipboard title="Copy Trace Link" content={traceUrl} />}

            {/* Related logs section */}
            <ActionPanel.Section title="Related">
              {traceId && (
                <Action
                  title="Find Logs with This Trace ID"
                  icon={Icon.MagnifyingGlass}
                  onAction={() => {
                    // Would navigate back to search logs with trace_id filter
                    // For now, copy the trace ID as a workaround
                  }}
                />
              )}
              {serviceName && (
                <Action
                  title="Find Logs for This Service ±5 Min"
                  icon={Icon.MagnifyingGlass}
                  onAction={() => {
                    // Would navigate to search logs with service filter and time window
                  }}
                />
              )}
              {serviceName && (
                <Action
                  title="Find All Errors in This Service Today"
                  icon={Icon.XMarkCircle}
                  onAction={() => {
                    // Would navigate to search logs with ERROR level and service filter
                  }}
                />
              )}
            </ActionPanel.Section>

            {/* AI Analysis section — only if Raycast AI is available */}
            {environment.canAccess(AI) && log.content && (
              <ActionPanel.Section title="AI Analysis">
                <Action
                  title="Explain This Error"
                  icon={Icon.LightBulb}
                  onAction={async () => {
                    const toast = await showToast({
                      style: Toast.Style.Animated,
                      title: "Analyzing error with AI...",
                    });

                    try {
                      const explanation = await AI.ask(
                        `Please analyze and explain the following error or log entry. Provide possible causes and suggested fixes:\n\n${log.content}`,
                        { creativity: "low" },
                      );

                      toast.hide();
                      push(<AIAnalysisDetail content={explanation} />);
                    } catch (error) {
                      toast.style = Toast.Style.Failure;
                      toast.title = "AI Analysis Failed";
                      toast.message = error instanceof Error ? error.message : "Unknown error";
                    }
                  }}
                />
                {serviceName && (
                  <Action
                    title="Summarize Last 10 Errors for This Service"
                    icon={Icon.TextDocument}
                    onAction={async () => {
                      const toast = await showToast({
                        style: Toast.Style.Animated,
                        title: "Analyzing service errors with AI...",
                      });

                      try {
                        // In a real implementation, you would fetch the last 10 ERROR records for this service
                        // For now, we'll provide a summary prompt based on the current log
                        const summary = await AI.ask(
                          `Please provide a summary of common error patterns and root causes for the service "${serviceName}" based on recent error logs. Include:\n1. Top 3 most common error types\n2. Suggested mitigation strategies\n3. Recommended monitoring enhancements\n\nContext: This service recently had the following error:\n${log.content}`,
                          { creativity: "low" },
                        );

                        toast.hide();
                        push(<AIAnalysisDetail content={`## Error Summary for ${serviceName}\n\n${summary}`} />);
                      } catch (error) {
                        toast.style = Toast.Style.Failure;
                        toast.title = "Analysis Failed";
                        toast.message = error instanceof Error ? error.message : "Unknown error";
                      }
                    }}
                  />
                )}
              </ActionPanel.Section>
            )}

            {/* Jira Integration section */}
            {hasJiraConfig && log.content && (
              <ActionPanel.Section title="Jira">
                <Action
                  title="Create Jira Issue"
                  icon={Icon.Bug}
                  onAction={() => {
                    const firstLine = log.content!.split("\n")[0].slice(0, 80);
                    const summary = `[Dynatrace] ${firstLine}${log.content!.length > 80 ? "..." : ""}`;
                    const description = `**Service**: ${log["service.name"] || "Unknown"}\n**Log Level**: ${log.loglevel || "N/A"}\n**Timestamp**: ${log.timestamp}\n\n**Error**:\n\`\`\`\n${log.content}\n\`\`\`\n\n[Open in Dynatrace](${logsUrl})`;

                    push(
                      <JiraIssueForm
                        initialSummary={summary}
                        initialDescription={description}
                        onSuccess={(issueKey, issueUrl) => {
                          push(<JiraIssueResult issueKey={issueKey} issueUrl={issueUrl} />);
                        }}
                      />,
                    );
                  }}
                />
              </ActionPanel.Section>
            )}
          </ActionPanel>
        }
        metadata={
          <Detail.Metadata>
            {/* ── Section: Log Info ────────────────────────────────────────── */}
            {/* Status colored by log level: WARN=yellow, ERROR/FATAL=red, INFO=gray */}
            {status && (
              <Detail.Metadata.TagList title="Status">
                <Detail.Metadata.TagList.Item text={status} color={levelColor(loglevel, status)} />
              </Detail.Metadata.TagList>
            )}
            {eventType && <Detail.Metadata.Label title="Event Type" text={eventType} />}
            {log.timestamp && (
              <Detail.Metadata.Label title="Timestamp" text={new Date(log.timestamp).toLocaleString()} />
            )}

            {/* ── Section: Service / Process ───────────────────────────────── */}
            {hasServiceInfo && <Detail.Metadata.Separator />}
            {serviceName && <Detail.Metadata.Label title="Service" text={serviceName} />}
            {appName && <Detail.Metadata.Label title="App Name" text={appName} />}
            {appVersion && <Detail.Metadata.Label title="App Version" text={appVersion} />}
            {processName && <Detail.Metadata.Label title="Process" text={processName} />}
            {/* Technologies as individual tags — easier to scan than a plain comma-list */}
            {processTech && (
              <Detail.Metadata.TagList title="Technologies">
                {toArray(log["process.technology"]).map((tech) => (
                  <Detail.Metadata.TagList.Item key={tech} text={tech} />
                ))}
              </Detail.Metadata.TagList>
            )}
            {logSource && <Detail.Metadata.Label title="Log Source" text={logSource} />}
            {operatorVersion && <Detail.Metadata.Label title="Operator Version" text={operatorVersion} />}

            {/* ── Section: Infrastructure ──────────────────────────────────── */}
            {hasInfraInfo && <Detail.Metadata.Separator />}
            {hostName && <Detail.Metadata.Label title="Host" text={hostName} />}
            {hostGroup && <Detail.Metadata.Label title="Host Group" text={hostGroup} />}
            {awsRegion && <Detail.Metadata.Label title="AWS Region" text={awsRegion} />}
            {awsAz && <Detail.Metadata.Label title="Availability Zone" text={awsAz} />}
            {awsAccount && <Detail.Metadata.Label title="AWS Account" text={awsAccount} />}
            {awsArn && <Detail.Metadata.Label title="AWS ARN" text={awsArn} />}

            {/* ── Section: Kubernetes ──────────────────────────────────────── */}
            {hasK8sInfo && <Detail.Metadata.Separator />}
            {k8sCluster && <Detail.Metadata.Label title="K8s Cluster" text={k8sCluster} />}
            {/* Namespace in blue — important K8s scope context */}
            {k8sNamespace && (
              <Detail.Metadata.TagList title="Namespace">
                <Detail.Metadata.TagList.Item text={k8sNamespace} color={Color.Blue} />
              </Detail.Metadata.TagList>
            )}
            {k8sNode && <Detail.Metadata.Label title="Node" text={k8sNode} />}

            {/* ── Section: Pipeline / Ingestion ────────────────────────────── */}
            {hasPipelineInfo && <Detail.Metadata.Separator />}
            {/* Pipeline source in orange — distinguishes ingestion type at a glance */}
            {pipelineSource && (
              <Detail.Metadata.TagList title="Pipeline Source">
                <Detail.Metadata.TagList.Item text={pipelineSource} color={Color.Orange} />
              </Detail.Metadata.TagList>
            )}
            {pipelines && <Detail.Metadata.Label title="Pipelines" text={pipelines} />}

            {/* ── Section: Telemetry ───────────────────────────────────────── */}
            {hasTelemetry && <Detail.Metadata.Separator />}
            {traceId && <Detail.Metadata.Label title="Trace ID" text={traceId} />}
            {spanId && <Detail.Metadata.Label title="Span ID" text={spanId} />}
            {traceUrl && <Detail.Metadata.Link title="Distributed Trace" target={traceUrl} text="Open in Explorer" />}
          </Detail.Metadata>
        }
      />
    );
  } catch (error) {
    return (
      <Detail
        markdown={`# Error Loading Log Details\n\n\`\`\`\n${error instanceof Error ? error.message : String(error)}\n\`\`\``}
        navigationTitle="Error"
      />
    );
  }
}
