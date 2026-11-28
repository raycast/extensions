import type {
  AgentsListResult,
  ChannelsStatusResult,
  SessionRow,
  TasksListResult,
} from "@openclaw/gateway-protocol";
import type { GatewayConnection, OpenClawGateway } from "./gateway";

const SESSION_LIMIT = 30;
const TASK_LIMIT = 30;

type SessionListResult = {
  sessions?: SessionRow[];
  totalCount?: number;
  hasMore?: boolean;
};

type ReadResult<T> =
  { ok: true; value: T } | { ok: false; issue: ControlCenterIssue };

export type ControlCenterIssue = {
  method: string;
  reason: "unsupported" | "failed";
  message: string;
};

export type ControlCenterTask = {
  id: string;
  title: string;
  status:
    "queued" | "running" | "completed" | "failed" | "cancelled" | "timed_out";
  agentId?: string;
  sessionKey?: string;
  runtime?: string;
  progress?: string;
  error?: string;
  lastToolName?: string;
  toolUseCount?: number;
  updatedAt?: number;
  startedAt?: number;
  endedAt?: number;
  filesChanged?: number;
  linesAdded?: number;
  linesRemoved?: number;
};

export type ControlCenterSession = {
  key: string;
  title: string;
  preview?: string;
  status?: string;
  agentId?: string;
  model?: string;
  modelProvider?: string;
  channel?: string;
  kind: string;
  updatedAt?: number;
  unread: boolean;
  pinned: boolean;
  totalTokens?: number;
  estimatedCostUsd?: number;
  permissionMode?: string;
};

export type ControlCenterAgent = {
  id: string;
  name: string;
  emoji?: string;
  model?: string;
  runtime?: string;
  permissionMode?: string;
  isDefault: boolean;
};

export type ControlCenterNode = {
  id: string;
  name: string;
  connected: boolean;
  platform?: string;
  version?: string;
  lastSeenAt?: number;
  capabilityCount?: number;
};

export type ControlCenterChannel = {
  id: string;
  channel: string;
  label: string;
  accountId: string;
  accountName?: string;
  state: "connected" | "running" | "stopped" | "not-configured";
  activeRuns?: number;
  lastActivityAt?: number;
  lastError?: string;
};

export type ControlCenterUsage = {
  totalTokens?: number;
  totalCostUsd?: number;
  inputTokens?: number;
  outputTokens?: number;
  days?: number;
  startDate?: string;
  endDate?: string;
};

export type ControlCenterSnapshot = {
  fetchedAt: number;
  connection: GatewayConnection;
  tasks: ControlCenterTask[];
  sessions: ControlCenterSession[];
  sessionTotal?: number;
  sessionsHaveMore: boolean;
  agents: ControlCenterAgent[];
  nodes: ControlCenterNode[];
  channels: ControlCenterChannel[];
  usage?: ControlCenterUsage;
  issues: ControlCenterIssue[];
};

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function timestampValue(value: unknown): number | undefined {
  const numeric = numberValue(value);
  if (numeric !== undefined) return numeric;
  if (typeof value !== "string") return undefined;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function nestedNumber(
  record: Record<string, unknown> | undefined,
  keys: string[],
): number | undefined {
  for (const key of keys) {
    const value = numberValue(record?.[key]);
    if (value !== undefined) return value;
  }
  return undefined;
}

function readableError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Request failed.";
  return message.replace(/\s+/g, " ").trim().slice(0, 240);
}

async function read<T>(
  gateway: OpenClawGateway,
  method: string,
  params: unknown,
): Promise<ReadResult<T>> {
  if (!gateway.supports(method)) {
    return {
      ok: false,
      issue: {
        method,
        reason: "unsupported",
        message: `${method} is not available on this Gateway.`,
      },
    };
  }

  try {
    return { ok: true, value: await gateway.request<T>(method, params) };
  } catch (error) {
    return {
      ok: false,
      issue: {
        method,
        reason: "failed",
        message: readableError(error),
      },
    };
  }
}

function normalizeTasks(result: TasksListResult): ControlCenterTask[] {
  return result.tasks
    .map((task) => ({
      id: task.id,
      title: task.title?.trim() || task.kind?.trim() || `Task ${task.id}`,
      status: task.status,
      agentId: task.agentId,
      sessionKey: task.childSessionKey ?? task.sessionKey,
      runtime: task.runtime,
      progress:
        task.progressSummary ?? task.lastActivity ?? task.terminalSummary,
      error: task.error,
      lastToolName: task.lastToolName,
      toolUseCount: task.toolUseCount,
      updatedAt: timestampValue(task.updatedAt),
      startedAt: timestampValue(task.startedAt),
      endedAt: timestampValue(task.endedAt),
      filesChanged: task.diffStat?.files,
      linesAdded: task.diffStat?.added,
      linesRemoved: task.diffStat?.removed,
    }))
    .sort((left, right) => (right.updatedAt ?? 0) - (left.updatedAt ?? 0));
}

function sessionTitle(session: SessionRow): string {
  return (
    session.displayName?.trim() ||
    session.label?.trim() ||
    session.derivedTitle?.trim() ||
    session.autoLabel?.trim() ||
    session.key
  );
}

function normalizeSessions(result: SessionListResult): ControlCenterSession[] {
  return (result.sessions ?? [])
    .map((session) => ({
      key: session.key,
      title: sessionTitle(session),
      preview: session.lastMessagePreview,
      status: session.status,
      agentId: session.agentId,
      model: session.activeModel ?? session.model,
      modelProvider: session.activeModelProvider ?? session.modelProvider,
      channel: session.channel,
      kind: session.kind,
      updatedAt:
        session.lastInteractionAt ??
        session.lastActivityAt ??
        session.updatedAt ??
        undefined,
      unread: session.unread === true,
      pinned: session.pinned === true,
      totalTokens: session.totalTokens,
      estimatedCostUsd: session.estimatedCostUsd,
      permissionMode: session.permissionMode,
    }))
    .sort((left, right) => (right.updatedAt ?? 0) - (left.updatedAt ?? 0));
}

function normalizeAgents(result: AgentsListResult): ControlCenterAgent[] {
  return result.agents.map((agent) => ({
    id: agent.id,
    name: agent.identity?.name ?? agent.name ?? agent.id,
    emoji: agent.identity?.emoji,
    model: agent.model?.primary,
    runtime: agent.agentRuntime?.id,
    permissionMode: agent.defaultPermissionMode,
    isDefault: agent.id === result.defaultId,
  }));
}

function normalizeNodes(value: unknown): ControlCenterNode[] {
  const envelope = asRecord(value);
  const rows = Array.isArray(value)
    ? value
    : Array.isArray(envelope?.nodes)
      ? envelope.nodes
      : [];

  return rows.flatMap((value): ControlCenterNode[] => {
    const node = asRecord(value);
    if (!node) return [];
    const id = stringValue(node.nodeId) ?? stringValue(node.id);
    if (!id) return [];

    const capabilities = Array.isArray(node.commands)
      ? node.commands.length
      : Array.isArray(node.caps)
        ? node.caps.length
        : undefined;

    return [
      {
        id,
        name:
          stringValue(node.displayName) ??
          stringValue(node.name) ??
          stringValue(node.hostname) ??
          id,
        connected: node.connected === true,
        platform: stringValue(node.platform) ?? stringValue(node.deviceFamily),
        version: stringValue(node.version) ?? stringValue(node.clientVersion),
        lastSeenAt:
          timestampValue(node.lastSeenAtMs) ?? timestampValue(node.lastSeenAt),
        capabilityCount: capabilities,
      },
    ];
  });
}

function normalizeChannels(
  result: ChannelsStatusResult,
): ControlCenterChannel[] {
  const channels: ControlCenterChannel[] = [];

  for (const channel of result.channelOrder) {
    const accounts = result.channelAccounts[channel] ?? [];
    for (const account of accounts) {
      const state: ControlCenterChannel["state"] = account.connected
        ? "connected"
        : account.running
          ? "running"
          : account.configured
            ? "stopped"
            : "not-configured";
      channels.push({
        id: `${channel}:${account.accountId}`,
        channel,
        label: result.channelLabels[channel] ?? channel,
        accountId: account.accountId,
        accountName: account.name,
        state,
        activeRuns: account.activeRuns,
        lastActivityAt:
          account.lastRunActivityAt ??
          account.lastTransportActivityAt ??
          account.lastConnectedAt ??
          undefined,
        lastError: account.lastError ?? undefined,
      });
    }
  }

  return channels;
}

function normalizeUsage(value: unknown): ControlCenterUsage {
  const root = asRecord(value);
  const totals = asRecord(root?.totals);
  const daily = Array.isArray(root?.daily) ? root.daily : [];

  return {
    totalTokens:
      nestedNumber(totals, ["totalTokens", "tokens"]) ??
      nestedNumber(root, ["totalTokens", "tokens"]),
    totalCostUsd:
      nestedNumber(totals, ["totalCost", "totalCostUsd", "cost"]) ??
      nestedNumber(root, ["totalCost", "totalCostUsd", "cost"]),
    inputTokens:
      nestedNumber(totals, ["inputTokens", "input"]) ??
      nestedNumber(root, ["inputTokens", "input"]),
    outputTokens:
      nestedNumber(totals, ["outputTokens", "output"]) ??
      nestedNumber(root, ["outputTokens", "output"]),
    days: daily.length || numberValue(root?.days),
    startDate: stringValue(root?.startDate) ?? stringValue(root?.start),
    endDate: stringValue(root?.endDate) ?? stringValue(root?.end),
  };
}

export async function loadControlCenterSnapshot(
  gateway: OpenClawGateway,
): Promise<ControlCenterSnapshot> {
  const [tasks, sessions, agents, nodes, channels, usage] = await Promise.all([
    read<TasksListResult>(gateway, "tasks.list", {
      limit: TASK_LIMIT,
      sortBy: "updatedAt",
    }),
    read<SessionListResult>(gateway, "sessions.list", {
      limit: SESSION_LIMIT,
      archived: false,
      configuredAgentsOnly: true,
      includeDerivedTitles: true,
      includeLastMessage: true,
      ownerFirst: true,
      sortBy: "lastInteractionAt",
    }),
    read<AgentsListResult>(gateway, "agents.list", {}),
    read<unknown>(gateway, "node.list", {}),
    read<ChannelsStatusResult>(gateway, "channels.status", { probe: false }),
    read<unknown>(gateway, "usage.cost", {
      agentId: gateway.connection.agentId,
    }),
  ]);

  const issues = [tasks, sessions, agents, nodes, channels, usage].flatMap(
    (result) => (result.ok ? [] : [result.issue]),
  );

  return {
    fetchedAt: Date.now(),
    connection: gateway.connection,
    tasks: tasks.ok ? normalizeTasks(tasks.value) : [],
    sessions: sessions.ok ? normalizeSessions(sessions.value) : [],
    sessionTotal: sessions.ok ? sessions.value.totalCount : undefined,
    sessionsHaveMore: sessions.ok ? sessions.value.hasMore === true : false,
    agents: agents.ok ? normalizeAgents(agents.value) : [],
    nodes: nodes.ok ? normalizeNodes(nodes.value) : [],
    channels: channels.ok ? normalizeChannels(channels.value) : [],
    usage: usage.ok ? normalizeUsage(usage.value) : undefined,
    issues,
  };
}
