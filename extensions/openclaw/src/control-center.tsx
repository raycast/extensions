import {
  Action,
  ActionPanel,
  Color,
  Icon,
  launchCommand,
  LaunchType,
  List,
  LocalStorage,
  openExtensionPreferences,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getControlCenterSnapshot, getPreferences } from "./api";
import type {
  ControlCenterAgent,
  ControlCenterChannel,
  ControlCenterIssue,
  ControlCenterNode,
  ControlCenterSession,
  ControlCenterSnapshot,
  ControlCenterTask,
  ControlCenterUsage,
} from "./openclaw/control-center";
import { CONNECTION_MODE_LABELS } from "./openclaw/config";

const CACHE_KEY = "openclaw-control-center-v1";
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

type ViewScope =
  "overview" | "tasks" | "sessions" | "agents" | "system" | "all";

function isSnapshot(value: unknown): value is ControlCenterSnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Partial<ControlCenterSnapshot>;
  return (
    typeof snapshot.fetchedAt === "number" &&
    snapshot.connection !== undefined &&
    Array.isArray(snapshot.tasks) &&
    Array.isArray(snapshot.sessions) &&
    Array.isArray(snapshot.agents) &&
    Array.isArray(snapshot.nodes) &&
    Array.isArray(snapshot.channels) &&
    Array.isArray(snapshot.issues)
  );
}

async function loadCachedSnapshot(): Promise<
  ControlCenterSnapshot | undefined
> {
  const stored = await LocalStorage.getItem<string>(CACHE_KEY);
  if (!stored) return undefined;

  try {
    const value: unknown = JSON.parse(stored);
    if (!isSnapshot(value)) return undefined;
    if (Date.now() - value.fetchedAt > CACHE_MAX_AGE_MS) return undefined;
    if (value.connection.gatewayUrl !== getPreferences().gatewayUrl) {
      return undefined;
    }
    return value;
  } catch {
    return undefined;
  }
}

function relativeTime(timestamp?: number): string | undefined {
  if (!timestamp) return undefined;
  const deltaSeconds = Math.round((timestamp - Date.now()) / 1000);
  const absolute = Math.abs(deltaSeconds);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (absolute < 60) return formatter.format(deltaSeconds, "second");
  if (absolute < 3_600) {
    return formatter.format(Math.round(deltaSeconds / 60), "minute");
  }
  if (absolute < 86_400) {
    return formatter.format(Math.round(deltaSeconds / 3_600), "hour");
  }
  if (absolute < 2_592_000) {
    return formatter.format(Math.round(deltaSeconds / 86_400), "day");
  }
  return new Date(timestamp).toLocaleDateString();
}

function fullDate(timestamp?: number): string | undefined {
  if (!timestamp) return undefined;
  return new Date(timestamp).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatCount(value?: number): string | undefined {
  return value === undefined
    ? undefined
    : new Intl.NumberFormat().format(value);
}

function formatCost(value?: number): string | undefined {
  return value === undefined
    ? undefined
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: value < 0.01 ? 4 : 2,
        maximumFractionDigits: value < 0.01 ? 4 : 2,
      }).format(value);
}

function markdownText(value: string): string {
  return value.replace(/[\\`*_[\]<>]/g, "\\$&");
}

function matchesSearch(query: string, ...values: (string | undefined)[]) {
  if (!query) return true;
  return values.some((value) => value?.toLowerCase().includes(query));
}

function statusIcon(status?: string): { source: Icon; tintColor: Color } {
  switch (status) {
    case "running":
    case "connected":
      return { source: Icon.CircleFilled, tintColor: Color.Green };
    case "queued":
    case "running-channel":
      return { source: Icon.Clock, tintColor: Color.Orange };
    case "completed":
    case "done":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    case "failed":
    case "timed_out":
      return { source: Icon.XMarkCircle, tintColor: Color.Red };
    case "cancelled":
    case "killed":
    case "stopped":
      return { source: Icon.CircleDisabled, tintColor: Color.SecondaryText };
    case "not-configured":
      return { source: Icon.Circle, tintColor: Color.SecondaryText };
    default:
      return { source: Icon.Circle, tintColor: Color.Blue };
  }
}

function taskSubtitle(task: ControlCenterTask): string {
  return [
    task.status.replace("_", " "),
    task.agentId,
    relativeTime(task.updatedAt),
  ]
    .filter(Boolean)
    .join(" · ");
}

function sessionSubtitle(session: ControlCenterSession): string {
  return [
    session.status ?? session.kind,
    session.agentId,
    session.model,
    relativeTime(session.updatedAt),
  ]
    .filter(Boolean)
    .join(" · ");
}

function usageSubtitle(
  usage: ControlCenterUsage | undefined,
  issue: ControlCenterIssue | undefined,
): string {
  if (issue) return issue.message;
  if (!usage) return "The Gateway did not return aggregate usage.";
  const parts = [
    usage.totalTokens === undefined
      ? undefined
      : `${formatCount(usage.totalTokens)} tokens`,
    formatCost(usage.totalCostUsd),
    usage.days ? `${usage.days} days` : undefined,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Aggregate totals are unavailable.";
}

async function openSession(
  sessionKey: string,
  title: string,
  agentId?: string,
): Promise<void> {
  try {
    await launchCommand({
      name: "chat",
      type: LaunchType.UserInitiated,
      context: { sessionKey, title, agentId },
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could Not Open Chat",
      message:
        error instanceof Error
          ? error.message
          : "The command failed to launch.",
    });
  }
}

async function openStatus(): Promise<void> {
  try {
    await launchCommand({
      name: "status",
      type: LaunchType.UserInitiated,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could Not Open Gateway Status",
      message:
        error instanceof Error
          ? error.message
          : "The command failed to launch.",
    });
  }
}

function SharedActions({
  snapshot,
  onRefresh,
}: {
  snapshot: ControlCenterSnapshot;
  onRefresh: () => void;
}) {
  return (
    <ActionPanel.Section>
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={onRefresh}
      />
      <Action.OpenInBrowser
        title="Open OpenClaw Control UI"
        icon={Icon.Globe}
        url={snapshot.connection.webUrl}
        shortcut={Keyboard.Shortcut.Common.Open}
      />
    </ActionPanel.Section>
  );
}

function GatewayItem({
  snapshot,
  cached,
  liveError,
  onRefresh,
}: {
  snapshot: ControlCenterSnapshot;
  cached: boolean;
  liveError?: string;
  onRefresh: () => void;
}) {
  const connection = snapshot.connection;
  const warning = liveError
    ? `\n\n> Live refresh failed. This snapshot is from ${fullDate(snapshot.fetchedAt)}.\n>\n> ${markdownText(liveError)}`
    : cached
      ? `\n\n> Showing cached data from ${fullDate(snapshot.fetchedAt)} while the live refresh runs.`
      : "";

  return (
    <List.Item
      id="gateway"
      icon={statusIcon(connection.healthOk ? "connected" : undefined)}
      title="Gateway"
      subtitle={`${connection.serverVersion} · ${CONNECTION_MODE_LABELS[connection.connectionMode]}`}
      keywords={["status", "connection", connection.gatewayUrl]}
      detail={
        <List.Item.Detail
          markdown={`## Gateway ${connection.healthOk ? "healthy" : "connected"}${warning}`}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="Connection"
                text={CONNECTION_MODE_LABELS[connection.connectionMode]}
              />
              <List.Item.Detail.Metadata.Label
                title="Gateway"
                text={connection.gatewayUrl}
              />
              <List.Item.Detail.Metadata.Label
                title="OpenClaw"
                text={connection.serverVersion}
              />
              <List.Item.Detail.Metadata.Label
                title="Protocol"
                text={String(connection.protocol)}
              />
              <List.Item.Detail.Metadata.Label
                title="Handshake"
                text={`${connection.latencyMs} ms`}
              />
              <List.Item.Detail.Metadata.Label
                title="Available Methods"
                text={formatCount(connection.methods.length)}
              />
              <List.Item.Detail.Metadata.Label
                title="Updated"
                text={fullDate(snapshot.fetchedAt)}
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <SharedActions snapshot={snapshot} onRefresh={onRefresh} />
          <Action
            title="Open Connection Settings"
            icon={Icon.Cog}
            onAction={openExtensionPreferences}
          />
          <Action.CopyToClipboard
            title="Copy Gateway URL"
            content={connection.gatewayUrl}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}

function UsageItem({
  snapshot,
  onRefresh,
}: {
  snapshot: ControlCenterSnapshot;
  onRefresh: () => void;
}) {
  const usage = snapshot.usage;
  const issue = snapshot.issues.find((item) => item.method === "usage.cost");
  return (
    <List.Item
      id="usage"
      icon={{ source: Icon.BarChart, tintColor: Color.Purple }}
      title="Usage"
      subtitle={usageSubtitle(usage, issue)}
      keywords={["tokens", "cost", "spend"]}
      detail={
        <List.Item.Detail
          markdown={
            issue
              ? `## Usage unavailable\n\n${markdownText(issue.message)}`
              : "## Gateway usage\n\nOpenClaw calculates these totals from its usage records."
          }
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="Total Tokens"
                text={formatCount(usage?.totalTokens) ?? "Unavailable"}
              />
              <List.Item.Detail.Metadata.Label
                title="Input Tokens"
                text={formatCount(usage?.inputTokens) ?? "Unavailable"}
              />
              <List.Item.Detail.Metadata.Label
                title="Output Tokens"
                text={formatCount(usage?.outputTokens) ?? "Unavailable"}
              />
              <List.Item.Detail.Metadata.Label
                title="Estimated Cost"
                text={formatCost(usage?.totalCostUsd) ?? "Unavailable"}
              />
              {usage?.startDate ? (
                <List.Item.Detail.Metadata.Label
                  title="From"
                  text={usage.startDate}
                />
              ) : null}
              {usage?.endDate ? (
                <List.Item.Detail.Metadata.Label
                  title="Through"
                  text={usage.endDate}
                />
              ) : null}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <SharedActions snapshot={snapshot} onRefresh={onRefresh} />
        </ActionPanel>
      }
    />
  );
}

function TaskItem({
  task,
  snapshot,
  onRefresh,
}: {
  task: ControlCenterTask;
  snapshot: ControlCenterSnapshot;
  onRefresh: () => void;
}) {
  const detail =
    task.error ?? task.progress ?? "No progress summary is available.";

  return (
    <List.Item
      id={`task:${task.id}`}
      icon={statusIcon(task.status)}
      title={task.title}
      subtitle={taskSubtitle(task)}
      keywords={[task.id, task.status, task.agentId ?? "", task.runtime ?? ""]}
      detail={
        <List.Item.Detail
          markdown={`## ${markdownText(task.title)}\n\n${markdownText(detail)}`}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="Status"
                text={task.status.replace("_", " ")}
              />
              <List.Item.Detail.Metadata.Label title="Task ID" text={task.id} />
              {task.agentId ? (
                <List.Item.Detail.Metadata.Label
                  title="Agent"
                  text={task.agentId}
                />
              ) : null}
              {task.runtime ? (
                <List.Item.Detail.Metadata.Label
                  title="Runtime"
                  text={task.runtime}
                />
              ) : null}
              {task.lastToolName ? (
                <List.Item.Detail.Metadata.Label
                  title="Last Tool"
                  text={task.lastToolName}
                />
              ) : null}
              {task.toolUseCount !== undefined ? (
                <List.Item.Detail.Metadata.Label
                  title="Tool Calls"
                  text={formatCount(task.toolUseCount)}
                />
              ) : null}
              {task.filesChanged !== undefined ? (
                <List.Item.Detail.Metadata.Label
                  title="Changes"
                  text={`${task.filesChanged} files · +${task.linesAdded ?? 0} −${task.linesRemoved ?? 0}`}
                />
              ) : null}
              {task.updatedAt ? (
                <List.Item.Detail.Metadata.Label
                  title="Updated"
                  text={fullDate(task.updatedAt)}
                />
              ) : null}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          {task.sessionKey ? (
            <Action
              title="Continue Session"
              icon={Icon.Message}
              onAction={() =>
                openSession(task.sessionKey!, task.title, task.agentId)
              }
            />
          ) : null}
          <Action.CopyToClipboard
            title="Copy Task ID"
            icon={Icon.CopyClipboard}
            content={task.id}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <SharedActions snapshot={snapshot} onRefresh={onRefresh} />
        </ActionPanel>
      }
    />
  );
}

function SessionItem({
  session,
  snapshot,
  onRefresh,
}: {
  session: ControlCenterSession;
  snapshot: ControlCenterSnapshot;
  onRefresh: () => void;
}) {
  return (
    <List.Item
      id={`session:${session.key}`}
      icon={statusIcon(session.status)}
      title={session.title}
      subtitle={sessionSubtitle(session)}
      keywords={[
        session.key,
        session.agentId ?? "",
        session.model ?? "",
        session.channel ?? "",
      ]}
      detail={
        <List.Item.Detail
          markdown={
            session.preview
              ? `## Latest message\n\n${markdownText(session.preview)}`
              : "## Session\n\nNo message preview is available."
          }
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="Session Key"
                text={session.key}
              />
              {session.status ? (
                <List.Item.Detail.Metadata.Label
                  title="Status"
                  text={session.status}
                />
              ) : null}
              {session.agentId ? (
                <List.Item.Detail.Metadata.Label
                  title="Agent"
                  text={session.agentId}
                />
              ) : null}
              {session.model ? (
                <List.Item.Detail.Metadata.Label
                  title="Model"
                  text={
                    session.modelProvider
                      ? `${session.modelProvider}/${session.model}`
                      : session.model
                  }
                />
              ) : null}
              {session.channel ? (
                <List.Item.Detail.Metadata.Label
                  title="Channel"
                  text={session.channel}
                />
              ) : null}
              {session.permissionMode ? (
                <List.Item.Detail.Metadata.Label
                  title="Permissions"
                  text={session.permissionMode}
                />
              ) : null}
              {session.totalTokens !== undefined ? (
                <List.Item.Detail.Metadata.Label
                  title="Tokens"
                  text={formatCount(session.totalTokens)}
                />
              ) : null}
              {session.estimatedCostUsd !== undefined ? (
                <List.Item.Detail.Metadata.Label
                  title="Estimated Cost"
                  text={formatCost(session.estimatedCostUsd)}
                />
              ) : null}
              {session.updatedAt ? (
                <List.Item.Detail.Metadata.Label
                  title="Updated"
                  text={fullDate(session.updatedAt)}
                />
              ) : null}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action
            title="Continue Session"
            icon={Icon.Message}
            onAction={() =>
              openSession(session.key, session.title, session.agentId)
            }
          />
          <Action.CopyToClipboard
            title="Copy Session Key"
            icon={Icon.CopyClipboard}
            content={session.key}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <SharedActions snapshot={snapshot} onRefresh={onRefresh} />
        </ActionPanel>
      }
    />
  );
}

function AgentItem({
  agent,
  snapshot,
  onRefresh,
}: {
  agent: ControlCenterAgent;
  snapshot: ControlCenterSnapshot;
  onRefresh: () => void;
}) {
  return (
    <List.Item
      id={`agent:${agent.id}`}
      icon={{
        source: Icon.Person,
        tintColor: agent.isDefault ? Color.Blue : Color.SecondaryText,
      }}
      title={`${agent.emoji ? `${agent.emoji} ` : ""}${agent.name}`}
      subtitle={[
        agent.model,
        agent.runtime,
        agent.isDefault ? "default" : undefined,
      ]
        .filter(Boolean)
        .join(" · ")}
      keywords={[agent.id, agent.model ?? "", agent.runtime ?? ""]}
      detail={
        <List.Item.Detail
          markdown={`## ${markdownText(agent.name)}`}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="Agent ID"
                text={agent.id}
              />
              <List.Item.Detail.Metadata.Label
                title="Default"
                text={agent.isDefault ? "Yes" : "No"}
              />
              {agent.model ? (
                <List.Item.Detail.Metadata.Label
                  title="Model"
                  text={agent.model}
                />
              ) : null}
              {agent.runtime ? (
                <List.Item.Detail.Metadata.Label
                  title="Runtime"
                  text={agent.runtime}
                />
              ) : null}
              {agent.permissionMode ? (
                <List.Item.Detail.Metadata.Label
                  title="Default Permissions"
                  text={agent.permissionMode}
                />
              ) : null}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Agent ID"
            content={agent.id}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <SharedActions snapshot={snapshot} onRefresh={onRefresh} />
        </ActionPanel>
      }
    />
  );
}

function NodeItem({
  node,
  snapshot,
  onRefresh,
}: {
  node: ControlCenterNode;
  snapshot: ControlCenterSnapshot;
  onRefresh: () => void;
}) {
  return (
    <List.Item
      id={`node:${node.id}`}
      icon={statusIcon(node.connected ? "connected" : "stopped")}
      title={node.name}
      subtitle={[
        node.connected ? "connected" : "offline",
        node.platform,
        relativeTime(node.lastSeenAt),
      ]
        .filter(Boolean)
        .join(" · ")}
      keywords={[node.id, node.platform ?? "", node.version ?? ""]}
      detail={
        <List.Item.Detail
          markdown={`## ${markdownText(node.name)}`}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Node ID" text={node.id} />
              <List.Item.Detail.Metadata.Label
                title="Connection"
                text={node.connected ? "Connected" : "Offline"}
              />
              {node.platform ? (
                <List.Item.Detail.Metadata.Label
                  title="Platform"
                  text={node.platform}
                />
              ) : null}
              {node.version ? (
                <List.Item.Detail.Metadata.Label
                  title="Version"
                  text={node.version}
                />
              ) : null}
              {node.capabilityCount !== undefined ? (
                <List.Item.Detail.Metadata.Label
                  title="Capabilities"
                  text={formatCount(node.capabilityCount)}
                />
              ) : null}
              {node.lastSeenAt ? (
                <List.Item.Detail.Metadata.Label
                  title="Last Seen"
                  text={fullDate(node.lastSeenAt)}
                />
              ) : null}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Node ID"
            content={node.id}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <SharedActions snapshot={snapshot} onRefresh={onRefresh} />
        </ActionPanel>
      }
    />
  );
}

function ChannelItem({
  channel,
  snapshot,
  onRefresh,
}: {
  channel: ControlCenterChannel;
  snapshot: ControlCenterSnapshot;
  onRefresh: () => void;
}) {
  return (
    <List.Item
      id={`channel:${channel.id}`}
      icon={statusIcon(
        channel.state === "running" ? "running-channel" : channel.state,
      )}
      title={channel.accountName ?? channel.label}
      subtitle={[
        channel.label,
        channel.state.replace("-", " "),
        channel.activeRuns ? `${channel.activeRuns} active` : undefined,
      ]
        .filter(Boolean)
        .join(" · ")}
      keywords={[channel.channel, channel.accountId, channel.state]}
      detail={
        <List.Item.Detail
          markdown={
            channel.lastError
              ? `## ${markdownText(channel.label)}\n\n${markdownText(channel.lastError)}`
              : `## ${markdownText(channel.label)}\n\nNo channel error is reported.`
          }
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="State"
                text={channel.state.replace("-", " ")}
              />
              <List.Item.Detail.Metadata.Label
                title="Account ID"
                text={channel.accountId}
              />
              {channel.activeRuns !== undefined ? (
                <List.Item.Detail.Metadata.Label
                  title="Active Runs"
                  text={formatCount(channel.activeRuns)}
                />
              ) : null}
              {channel.lastActivityAt ? (
                <List.Item.Detail.Metadata.Label
                  title="Last Activity"
                  text={fullDate(channel.lastActivityAt)}
                />
              ) : null}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Account ID"
            content={channel.accountId}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <SharedActions snapshot={snapshot} onRefresh={onRefresh} />
        </ActionPanel>
      }
    />
  );
}

function IssueItem({
  issue,
  snapshot,
  onRefresh,
}: {
  issue: ControlCenterIssue;
  snapshot: ControlCenterSnapshot;
  onRefresh: () => void;
}) {
  return (
    <List.Item
      id={`issue:${issue.method}`}
      icon={{ source: Icon.Warning, tintColor: Color.Orange }}
      title={issue.method}
      subtitle={
        issue.reason === "unsupported" ? "Not supported" : "Unavailable"
      }
      detail={
        <List.Item.Detail
          markdown={`## ${markdownText(issue.method)}\n\n${markdownText(issue.message)}`}
        />
      }
      actions={
        <ActionPanel>
          <Action
            title="Check Gateway Status"
            icon={Icon.Gauge}
            onAction={openStatus}
          />
          <SharedActions snapshot={snapshot} onRefresh={onRefresh} />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const [snapshot, setSnapshot] = useState<ControlCenterSnapshot>();
  const [isLoading, setIsLoading] = useState(true);
  const [isCached, setIsCached] = useState(false);
  const [liveError, setLiveError] = useState<string>();
  const [scope, setScope] = useState<ViewScope>("overview");
  const [searchText, setSearchText] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<string>();

  const refresh = useCallback(async (notifyOnFailure = true) => {
    setIsLoading(true);
    try {
      const fresh = await getControlCenterSnapshot();
      setSnapshot(fresh);
      setIsCached(false);
      setLiveError(undefined);
      await LocalStorage.setItem(CACHE_KEY, JSON.stringify(fresh));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "OpenClaw did not respond.";
      setLiveError(message);
      if (notifyOnFailure) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Could Not Refresh OpenClaw",
          message,
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      const cached = await loadCachedSnapshot();
      if (active && cached) {
        setSnapshot(cached);
        setIsCached(true);
      }
      if (active) await refresh(!cached);
    })();
    return () => {
      active = false;
    };
  }, [refresh]);

  const activeTasks = useMemo(
    () =>
      snapshot?.tasks.filter((task) =>
        ["queued", "running"].includes(task.status),
      ) ?? [],
    [snapshot],
  );
  const recentTasks = useMemo(
    () =>
      snapshot?.tasks.filter(
        (task) => !["queued", "running"].includes(task.status),
      ) ?? [],
    [snapshot],
  );

  const query = searchText.trim().toLowerCase();
  const gatewayMatches = matchesSearch(
    query,
    "gateway status connection",
    snapshot?.connection.gatewayUrl,
    snapshot?.connection.serverVersion,
    snapshot
      ? CONNECTION_MODE_LABELS[snapshot.connection.connectionMode]
      : undefined,
  );
  const usageMatches = matchesSearch(query, "usage tokens cost spend");
  const visibleActiveTasks = useMemo(
    () =>
      activeTasks.filter((task) =>
        matchesSearch(
          query,
          task.title,
          task.id,
          task.status,
          task.agentId,
          task.runtime,
        ),
      ),
    [activeTasks, query],
  );
  const visibleRecentTasks = useMemo(
    () =>
      recentTasks.filter((task) =>
        matchesSearch(
          query,
          task.title,
          task.id,
          task.status,
          task.agentId,
          task.runtime,
        ),
      ),
    [query, recentTasks],
  );
  const visibleSessions = useMemo(() => {
    const sessions =
      scope === "overview"
        ? (snapshot?.sessions ?? []).slice(0, 8)
        : (snapshot?.sessions ?? []);
    return sessions.filter((session) =>
      matchesSearch(
        query,
        session.title,
        session.key,
        session.status,
        session.agentId,
        session.model,
        session.channel,
      ),
    );
  }, [query, scope, snapshot]);
  const visibleAgents = useMemo(
    () =>
      (snapshot?.agents ?? []).filter((agent) =>
        matchesSearch(query, agent.name, agent.id, agent.model, agent.runtime),
      ),
    [query, snapshot],
  );
  const visibleNodes = useMemo(() => {
    const nodes =
      scope === "overview"
        ? (snapshot?.nodes ?? []).slice(0, 4)
        : (snapshot?.nodes ?? []);
    return nodes.filter((node) =>
      matchesSearch(query, node.name, node.id, node.platform, node.version),
    );
  }, [query, scope, snapshot]);
  const visibleChannels = useMemo(() => {
    const channels =
      scope === "overview"
        ? (snapshot?.channels ?? []).slice(0, 6)
        : (snapshot?.channels ?? []);
    return channels.filter((channel) =>
      matchesSearch(
        query,
        channel.label,
        channel.channel,
        channel.accountName,
        channel.accountId,
        channel.state,
      ),
    );
  }, [query, scope, snapshot]);
  const visibleIssues = useMemo(
    () =>
      (snapshot?.issues ?? []).filter((issue) =>
        matchesSearch(query, issue.method, issue.message, issue.reason),
      ),
    [query, snapshot],
  );
  const visibleItemIds = useMemo(() => {
    if (!snapshot) return [];
    const scopeIs = (...scopes: ViewScope[]) => scopes.includes(scope);
    const ids: string[] = [];
    if (scopeIs("overview", "system", "all")) {
      if (gatewayMatches) ids.push("gateway");
      if (usageMatches) ids.push("usage");
    }
    if (scopeIs("overview", "tasks", "all")) {
      ids.push(...visibleActiveTasks.map((task) => `task:${task.id}`));
    }
    if (scopeIs("tasks", "all")) {
      ids.push(...visibleRecentTasks.map((task) => `task:${task.id}`));
    }
    if (scopeIs("overview", "sessions", "all")) {
      ids.push(...visibleSessions.map((session) => `session:${session.key}`));
    }
    if (scopeIs("agents", "all")) {
      ids.push(...visibleAgents.map((agent) => `agent:${agent.id}`));
    }
    if (scopeIs("overview", "system", "all")) {
      ids.push(...visibleNodes.map((node) => `node:${node.id}`));
      ids.push(...visibleChannels.map((channel) => `channel:${channel.id}`));
      ids.push(...visibleIssues.map((issue) => `issue:${issue.method}`));
    }
    return ids;
  }, [
    gatewayMatches,
    scope,
    snapshot,
    usageMatches,
    visibleActiveTasks,
    visibleAgents,
    visibleChannels,
    visibleIssues,
    visibleNodes,
    visibleRecentTasks,
    visibleSessions,
  ]);

  useEffect(() => {
    setSelectedItemId((current) =>
      current && visibleItemIds.includes(current) ? current : visibleItemIds[0],
    );
  }, [visibleItemIds]);

  if (!snapshot) {
    return (
      <List
        isLoading={isLoading}
        filtering={false}
        searchText={searchText}
        onSearchTextChange={setSearchText}
      >
        <List.EmptyView
          icon={Icon.Cloud}
          title={
            liveError ? "OpenClaw Is Unavailable" : "Connecting to OpenClaw"
          }
          description={liveError ?? "Loading Gateway data."}
          actions={
            <ActionPanel>
              <Action
                title="Check Gateway Status"
                icon={Icon.Gauge}
                onAction={openStatus}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={() => refresh()}
              />
              <Action
                title="Open Connection Settings"
                icon={Icon.Cog}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const show = (...scopes: ViewScope[]) => scopes.includes(scope);
  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      selectedItemId={selectedItemId}
      onSelectionChange={(id) => setSelectedItemId(id ?? undefined)}
      searchBarPlaceholder="Search tasks, sessions, agents, and systems…"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select View"
          value={scope}
          onChange={(value) => setScope(value as ViewScope)}
        >
          <List.Dropdown.Item title="Overview" value="overview" />
          <List.Dropdown.Item title="Tasks" value="tasks" />
          <List.Dropdown.Item title="Sessions" value="sessions" />
          <List.Dropdown.Item title="Agents" value="agents" />
          <List.Dropdown.Item title="System" value="system" />
          <List.Dropdown.Item title="Everything" value="all" />
        </List.Dropdown>
      }
    >
      {visibleItemIds.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Matching OpenClaw Data"
          description={
            searchText
              ? "Try another search or view."
              : "OpenClaw returned no items for this view."
          }
        />
      ) : null}

      {show("overview", "system", "all") && (gatewayMatches || usageMatches) ? (
        <List.Section title="Gateway">
          {gatewayMatches ? (
            <GatewayItem
              snapshot={snapshot}
              cached={isCached}
              liveError={liveError}
              onRefresh={() => refresh()}
            />
          ) : null}
          {usageMatches ? (
            <UsageItem snapshot={snapshot} onRefresh={() => refresh()} />
          ) : null}
        </List.Section>
      ) : null}

      {show("overview", "tasks", "all") && visibleActiveTasks.length ? (
        <List.Section title="Running and queued">
          {visibleActiveTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              snapshot={snapshot}
              onRefresh={() => refresh()}
            />
          ))}
        </List.Section>
      ) : null}

      {show("tasks", "all") && visibleRecentTasks.length ? (
        <List.Section title="Recent tasks">
          {visibleRecentTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              snapshot={snapshot}
              onRefresh={() => refresh()}
            />
          ))}
        </List.Section>
      ) : null}

      {show("overview", "sessions", "all") && visibleSessions.length ? (
        <List.Section
          title="Recent sessions"
          subtitle={
            snapshot.sessionTotal !== undefined
              ? `${formatCount(snapshot.sessionTotal)} total${snapshot.sessionsHaveMore ? ", showing the latest" : ""}`
              : undefined
          }
        >
          {visibleSessions.map((session) => (
            <SessionItem
              key={session.key}
              session={session}
              snapshot={snapshot}
              onRefresh={() => refresh()}
            />
          ))}
        </List.Section>
      ) : null}

      {show("agents", "all") && visibleAgents.length ? (
        <List.Section title="Agents">
          {visibleAgents.map((agent) => (
            <AgentItem
              key={agent.id}
              agent={agent}
              snapshot={snapshot}
              onRefresh={() => refresh()}
            />
          ))}
        </List.Section>
      ) : null}

      {show("overview", "system", "all") && visibleNodes.length ? (
        <List.Section title="Nodes">
          {visibleNodes.map((node) => (
            <NodeItem
              key={node.id}
              node={node}
              snapshot={snapshot}
              onRefresh={() => refresh()}
            />
          ))}
        </List.Section>
      ) : null}

      {show("overview", "system", "all") && visibleChannels.length ? (
        <List.Section title="Channels">
          {visibleChannels.map((channel) => (
            <ChannelItem
              key={channel.id}
              channel={channel}
              snapshot={snapshot}
              onRefresh={() => refresh()}
            />
          ))}
        </List.Section>
      ) : null}

      {show("overview", "system", "all") && visibleIssues.length ? (
        <List.Section title="Unavailable">
          {visibleIssues.map((issue) => (
            <IssueItem
              key={issue.method}
              issue={issue}
              snapshot={snapshot}
              onRefresh={() => refresh()}
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}
