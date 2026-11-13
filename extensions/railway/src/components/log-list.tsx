import { useState } from "react";
import { Action, ActionPanel, Color, Icon, Image, Keyboard, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { DeploymentGQL, HttpLogGQL, LogGQL, LogType, LogsResult, fetchLogs } from "../railway";
import { ServiceContext, cliCommands } from "../cli";
import { formatTime, isInProgress, parseAttributeValue, stripAnsi, usePollWhile } from "../utils";

const logTypeTitles: Record<LogType, string> = {
  deploy: "Deploy Logs",
  build: "Build Logs",
  http: "HTTP Logs",
};

interface LogListProps {
  context: ServiceContext;
  deployment: DeploymentGQL;
  serviceName: string;
  dashboardUrl: string;
  initialType: LogType;
}

export function LogList({ context, deployment, serviceName, dashboardUrl, initialType }: LogListProps) {
  const [type, setType] = useState<LogType>(initialType);
  const [isShowingDetail, setIsShowingDetail] = useState(false);

  // Logs can contain secrets, so they are fetched fresh instead of being persisted in the cache
  const { isLoading, data, revalidate } = usePromise(fetchLogs, [type, deployment]);
  const result = data?.type === type ? data : undefined;

  usePollWhile(Boolean(result && isInProgress(result.status)), revalidate, 3000);

  const hasLogs = Boolean(result?.logs.length);

  const commonActions = (
    <>
      <Action.OpenInBrowser title="Open in Railway" url={dashboardUrl} shortcut={Keyboard.Shortcut.Common.Open} />
      {result && hasLogs && (
        <Action.CopyToClipboard
          title="Copy All Logs"
          content={formatAllLogs(result)}
          shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
        />
      )}
      <Action.CopyToClipboard
        title="Copy CLI Command"
        icon={Icon.Terminal}
        content={cliCommands.logs(context, { type, deploymentId: deployment.id })}
      />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={revalidate}
      />
    </>
  );

  const toggleDetailAction = (
    <Action
      title={isShowingDetail ? "Hide Details" : "Show Details"}
      icon={Icon.Sidebar}
      shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
      onAction={() => setIsShowingDetail((v) => !v)}
    />
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail && hasLogs}
      navigationTitle={`${serviceName} · ${logTypeTitles[type]}`}
      searchBarPlaceholder={type === "http" ? "Filter by path, status, or request ID" : "Filter logs"}
      searchBarAccessory={
        <List.Dropdown tooltip="Log Type" value={type} onChange={(value) => setType(value as LogType)}>
          {(Object.keys(logTypeTitles) as LogType[]).map((t) => (
            <List.Dropdown.Item key={t} title={logTypeTitles[t]} value={t} />
          ))}
        </List.Dropdown>
      }
    >
      {!isLoading && !hasLogs && (
        <List.EmptyView
          icon={Icon.Terminal}
          title={result && isInProgress(result.status) ? "Waiting for Logs…" : `No ${logTypeTitles[type]}`}
          actions={<ActionPanel>{commonActions}</ActionPanel>}
        />
      )}
      {result?.type === "http"
        ? [...result.logs].reverse().map((log, index) => (
            <HttpLogItem
              key={`${log.requestId}-${index}`}
              log={log}
              isShowingDetail={isShowingDetail}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    {toggleDetailAction}
                    <Action.CopyToClipboard
                      title="Copy Request ID"
                      content={log.requestId}
                      shortcut={Keyboard.Shortcut.Common.Copy}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>{commonActions}</ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))
        : result?.logs
            .map((log) => ({ ...log, message: stripAnsi(log.message) }))
            .filter((log) => log.message.trim())
            .reverse()
            .map((log, index) => (
              <LogItem
                key={`${log.timestamp}-${index}`}
                log={log}
                isShowingDetail={isShowingDetail}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      {toggleDetailAction}
                      <Action.CopyToClipboard
                        title="Copy Message"
                        content={log.message}
                        shortcut={Keyboard.Shortcut.Common.Copy}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section>{commonActions}</ActionPanel.Section>
                  </ActionPanel>
                }
              />
            ))}
    </List>
  );
}

type LogLevel = "error" | "warn" | "info";

const errorLevels = ["error", "err", "fatal", "critical"];
const warnLevels = ["warn", "warning"];

// Mirrors the CLI: a log is an error when it carries an `error` attribute or an error-ish level
function getLogLevel(log: LogGQL): LogLevel {
  const attribute = (name: string) => {
    const attr = log.attributes.find((a) => a.key === name);
    return attr ? parseAttributeValue(attr.value).toLowerCase() : undefined;
  };

  const error = attribute("error");
  if (error && error !== "null") return "error";

  const levels = [log.severity?.toLowerCase(), attribute("level"), attribute("severity"), attribute("lvl")];
  if (levels.some((l) => l && errorLevels.includes(l))) return "error";
  if (levels.some((l) => l && warnLevels.includes(l))) return "warn";
  return "info";
}

const levelIcons: Record<LogLevel, Image.ImageLike> = {
  error: { source: Icon.XMarkCircle, tintColor: Color.Red },
  warn: { source: Icon.Warning, tintColor: Color.Yellow },
  info: { source: Icon.Dot, tintColor: Color.SecondaryText },
};

function LogItem({ log, isShowingDetail, actions }: { log: LogGQL; isShowingDetail: boolean; actions: JSX.Element }) {
  const level = getLogLevel(log);

  return (
    <List.Item
      icon={{ value: levelIcons[level], tooltip: level }}
      title={log.message.trim()}
      accessories={
        isShowingDetail
          ? undefined
          : [{ text: formatTime(log.timestamp), tooltip: new Date(log.timestamp).toLocaleString() }]
      }
      detail={
        <List.Item.Detail
          markdown={codeBlock(log.message)}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Timestamp" text={new Date(log.timestamp).toLocaleString()} />
              <List.Item.Detail.Metadata.Label title="Level" text={level} icon={levelIcons[level]} />
              {log.attributes.length > 0 && <List.Item.Detail.Metadata.Separator />}
              {log.attributes.map((attr) => (
                <List.Item.Detail.Metadata.Label
                  key={attr.key}
                  title={attr.key}
                  text={parseAttributeValue(attr.value)}
                />
              ))}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={actions}
    />
  );
}

// Railway sends upstream errors as a JSON array like [{"error":"client has closed the request..."}]
function formatUpstreamErrors(raw: string): string | undefined {
  if (!raw) return undefined;
  try {
    const errors: Array<{ error?: string }> = JSON.parse(raw);
    const messages = errors.map((e) => e.error).filter((m): m is string => Boolean(m));
    return messages.length ? messages.join("\n") : undefined;
  } catch {
    return raw;
  }
}

function httpStatusColor(status: number): Color {
  if (status >= 500) return Color.Red;
  if (status >= 400) return Color.Orange;
  if (status >= 300) return Color.Blue;
  return Color.Green;
}

function HttpLogItem({
  log,
  isShowingDetail,
  actions,
}: {
  log: HttpLogGQL;
  isShowingDetail: boolean;
  actions: JSX.Element;
}) {
  const color = httpStatusColor(log.httpStatus);
  const upstreamErrors = formatUpstreamErrors(log.upstreamErrors);

  return (
    <List.Item
      icon={{ source: Icon.CircleFilled, tintColor: color }}
      title={`${log.method} ${log.path}`}
      keywords={[log.host, log.requestId, `${log.httpStatus}`]}
      accessories={
        isShowingDetail
          ? [{ tag: { value: `${log.httpStatus}`, color } }]
          : [
              { tag: { value: `${log.httpStatus}`, color } },
              { text: `${log.totalDuration}ms`, tooltip: "Total duration" },
              { text: formatTime(log.timestamp), tooltip: new Date(log.timestamp).toLocaleString() },
            ]
      }
      detail={
        <List.Item.Detail
          markdown={codeBlock(`${log.method} https://${log.host}${log.path}`)}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.TagList title="Status">
                <List.Item.Detail.Metadata.TagList.Item text={`${log.httpStatus}`} color={color} />
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.Label title="Timestamp" text={new Date(log.timestamp).toLocaleString()} />
              <List.Item.Detail.Metadata.Label title="Total Duration" text={`${log.totalDuration}ms`} />
              <List.Item.Detail.Metadata.Label title="Upstream Duration" text={`${log.upstreamRqDuration}ms`} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Host" text={log.host} />
              <List.Item.Detail.Metadata.Label title="Client IP" text={log.srcIp} />
              <List.Item.Detail.Metadata.Label title="Edge Region" text={log.edgeRegion} />
              <List.Item.Detail.Metadata.Label title="User Agent" text={log.clientUa} />
              <List.Item.Detail.Metadata.Label title="Request ID" text={log.requestId} />
              <List.Item.Detail.Metadata.Label title="Bytes Sent" text={`${log.txBytes}`} />
              <List.Item.Detail.Metadata.Label title="Bytes Received" text={`${log.rxBytes}`} />
              {upstreamErrors && <List.Item.Detail.Metadata.Label title="Upstream Errors" text={upstreamErrors} />}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={actions}
    />
  );
}

// Use a fence longer than any backtick run in the log so the message can't break out of the code block
function codeBlock(text: string): string {
  const longestRun = Math.max(2, ...(text.match(/`+/g) ?? []).map((run) => run.length));
  const fence = "`".repeat(longestRun + 1);
  return `${fence}\n${text}\n${fence}`;
}

function formatAllLogs(result: LogsResult): string {
  if (result.type === "http") {
    return result.logs
      .map((l) => `${l.timestamp} ${l.method} ${l.path} ${l.httpStatus} ${l.totalDuration}ms`)
      .join("\n");
  }
  return result.logs.map((l) => `${l.timestamp} ${stripAnsi(l.message)}`).join("\n");
}
