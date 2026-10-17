export const MIN_AGENT_CONTROL_VERSION = "2.1.169";

export type AgentState =
  | "working"
  | "blocked"
  | "done"
  | "failed"
  | "stopped"
  | "unknown";

export type AgentSection =
  | "needs-input"
  | "working"
  | "completed"
  | "failed"
  | "foreground"
  | "unknown";

export type AgentAction = "logs" | "stop" | "respawn" | "rm" | "attach";

export type AgentModel = "" | "fable" | "sonnet" | "opus" | "haiku";
export type AgentEffort = "" | "low" | "medium" | "high" | "xhigh" | "max";
export type AgentPermissionMode =
  | "default"
  | "plan"
  | "acceptEdits"
  | "auto"
  | "dontAsk";
export type AgentKind = "interactive" | "background" | "unknown";

export interface ClaudeAgentSession {
  id?: string;
  sessionId?: string;
  pid?: number;
  cwd: string;
  kind: AgentKind;
  rawKind?: string;
  startedAt: number;
  name?: string;
  state: AgentState;
  rawState?: string;
  status?: string;
  waitingFor?: string;
}

export interface DispatchAgentOptions {
  projectPath: string;
  task: string;
  name?: string;
  model: AgentModel;
  effort: AgentEffort;
  permissionMode: AgentPermissionMode;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function parseState(value: unknown): { state: AgentState; rawState?: string } {
  const rawState = optionalString(value);
  switch (rawState) {
    case "working":
    case "blocked":
    case "done":
    case "failed":
    case "stopped":
      return { state: rawState };
    default:
      return { state: "unknown", rawState };
  }
}

function parseKind(value: unknown): { kind: AgentKind; rawKind?: string } {
  const rawKind = optionalString(value);
  if (rawKind === "interactive" || rawKind === "background") {
    return { kind: rawKind };
  }
  return { kind: "unknown", rawKind };
}

/** Parse the public `claude agents --json` response without trusting its shape. */
export function parseAgentSessionsJson(json: string): ClaudeAgentSession[] {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    throw new Error("Claude returned invalid agent JSON");
  }

  if (!Array.isArray(value)) {
    throw new Error("Claude returned an invalid agent list");
  }

  const sessions: ClaudeAgentSession[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) continue;

    const cwd = optionalString(entry.cwd);
    const startedAt = entry.startedAt;
    if (!cwd || typeof startedAt !== "number") continue;

    const { state, rawState } = parseState(entry.state);
    const { kind, rawKind } = parseKind(entry.kind);
    sessions.push({
      id: optionalString(entry.id),
      sessionId: optionalString(entry.sessionId),
      pid:
        typeof entry.pid === "number" && Number.isFinite(entry.pid)
          ? entry.pid
          : undefined,
      cwd,
      kind,
      rawKind,
      startedAt,
      name: optionalString(entry.name),
      state,
      rawState,
      status: optionalString(entry.status),
      waitingFor: optionalString(entry.waitingFor),
    });
  }

  const backgroundSessionIds = new Set(
    sessions
      .filter((session) => session.id && session.sessionId)
      .map((session) => session.sessionId),
  );
  return sessions
    .filter(
      (session) =>
        session.kind !== "interactive" ||
        !session.sessionId ||
        !backgroundSessionIds.has(session.sessionId),
    )
    .sort((a, b) => b.startedAt - a.startedAt);
}

export function getAgentSection(agent: ClaudeAgentSession): AgentSection {
  if (agent.kind === "unknown") return "unknown";
  if (agent.kind === "interactive") return "foreground";
  if (!agent.id) return "unknown";
  const status = agent.status?.toLowerCase();
  if (
    agent.waitingFor ||
    agent.state === "blocked" ||
    status === "waiting" ||
    status === "blocked"
  ) {
    return "needs-input";
  }
  if (
    agent.state === "working" ||
    status === "busy" ||
    status === "working" ||
    status === "running"
  ) {
    return "working";
  }
  if (agent.state === "done" || status === "done" || status === "completed") {
    return "completed";
  }
  if (
    agent.state === "failed" ||
    agent.state === "stopped" ||
    status === "failed" ||
    status === "stopped"
  ) {
    return "failed";
  }
  return "unknown";
}

export function buildListAgentsArgs(includeCompleted: boolean): string[] {
  return ["agents", "--json", ...(includeCompleted ? ["--all"] : [])];
}

export function buildAgentActionArgs(
  action: AgentAction,
  id: string,
): string[] {
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(id)) {
    throw new Error("Claude returned an invalid agent ID");
  }
  return [action, id];
}

export function buildDispatchAgentArgs(
  options: DispatchAgentOptions,
): string[] {
  const task = options.task.trim();
  if (!task) throw new Error("Enter a task for the agent");

  const args = ["--bg"];
  const name = options.name?.trim();
  if (name) args.push("--name", name);
  if (options.model) args.push("--model", options.model);
  if (options.effort) args.push("--effort", options.effort);
  if (options.permissionMode !== "default") {
    args.push("--permission-mode", options.permissionMode);
  }
  args.push(task);
  return args;
}

export function isDaemonUnreachableMessage(message: string): boolean {
  return (
    /couldn.?t confirm .* was stopped/i.test(message) ||
    /background service may be restarting/i.test(message)
  );
}

export class LatestRequestGuard {
  private current = 0;

  begin(): number {
    return ++this.current;
  }

  isCurrent(request: number): boolean {
    return request === this.current;
  }
}

export function parseVersion(
  versionOutput: string,
): [number, number, number] | null {
  const match = versionOutput.match(/(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function isAgentControlVersionSupported(versionOutput: string): boolean {
  const parsed = parseVersion(versionOutput);
  const minimum = parseVersion(MIN_AGENT_CONTROL_VERSION);
  if (!parsed || !minimum) return false;

  for (let i = 0; i < parsed.length; i++) {
    if (parsed[i] > minimum[i]) return true;
    if (parsed[i] < minimum[i]) return false;
  }
  return true;
}
