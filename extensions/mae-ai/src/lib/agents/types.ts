import { createHash } from "node:crypto";

export type AgentBackend = "hermes" | "openclaw";
export type AgentState =
  | "idle"
  | "running"
  | "stopping"
  | "completed"
  | "cancelled"
  | "failed"
  | "unknown";

export interface AgentConfig {
  backend: AgentBackend;
  url: string;
  secret: string;
}

export interface AgentTarget {
  id: string;
  title: string;
}

export interface AgentSession {
  id: string;
  target: string;
  sessionId?: string;
  runId?: string;
  pendingSubmission?: string;
}

export interface AgentMessage {
  role: "user" | "assistant";
  text: string;
}

export interface AgentApproval {
  id: string;
  kind: string;
  title: string;
  detail: string;
  generation?: number;
  expiresAt?: number;
  allow: boolean;
}

export type AgentEvent =
  | { type: "history"; messages: AgentMessage[] }
  | { type: "text"; text: string }
  | { type: "progress"; text: string }
  | { type: "state"; state: AgentState; error?: string }
  | { type: "approvals"; approvals: AgentApproval[] }
  | { type: "session"; session: AgentSession };

export type AgentEmit = (event: AgentEvent) => void;

export interface AgentAdapter {
  targets(signal: AbortSignal): Promise<AgentTarget[]>;
  create(target: string): Promise<AgentSession>;
  restore(session: AgentSession, emit: AgentEmit): Promise<AgentSession>;
  send(
    session: AgentSession,
    query: string,
    instructions: string,
    submissionId: string,
  ): Promise<AgentSession>;
  watch(
    session: AgentSession,
    emit: AgentEmit,
    signal: AbortSignal,
  ): Promise<void>;
  stop(session: AgentSession): Promise<void>;
  approve(
    session: AgentSession,
    approval: AgentApproval,
    allow: boolean,
  ): Promise<void>;
  close(): Promise<void>;
}

export function normalizeAgentUrl(
  backend: AgentBackend,
  value: string,
): string {
  const url = new URL(value.trim());
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !(
      backend === "hermes"
        ? ["http:", "https:"]
        : ["http:", "https:", "ws:", "wss:"]
    ).includes(url.protocol)
  ) {
    throw new Error(
      "Use a server URL without embedded credentials, query, or fragment.",
    );
  }
  if (backend === "hermes") {
    url.pathname = url.pathname.replace(/\/v1(?:\/chat\/completions)?\/?$/, "");
  } else {
    url.protocol =
      url.protocol === "https:" || url.protocol === "wss:" ? "wss:" : "ws:";
    url.pathname = url.pathname.replace(/\/v1\/?$/, "");
  }
  return url.toString().replace(/\/$/, "");
}

export function agentScope(config: AgentConfig): string {
  return createHash("sha256")
    .update(JSON.stringify([config.backend, config.url, config.secret]))
    .digest("hex");
}

export function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function string(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function visibleText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value
      .filter((part) =>
        ["text", "output_text", "input_text"].includes(
          string(record(part).type),
        ),
      )
      .map((part) => string(record(part).text))
      .join("");
  }
  const message = record(value);
  return visibleText(message.content);
}

export function historyMessages(value: unknown): AgentMessage[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const message = record(item);
    const text = visibleText(message.content);
    return (message.role === "user" || message.role === "assistant") && text
      ? [{ role: message.role, text } as AgentMessage]
      : [];
  });
}

export function terminal(state: AgentState): boolean {
  return ["completed", "cancelled", "failed", "idle"].includes(state);
}

export function replaceAnswer(
  messages: AgentMessage[],
  text: string,
): AgentMessage[] {
  if (messages.at(-1)?.role === "assistant") {
    return [...messages.slice(0, -1), { role: "assistant", text }];
  }
  return [...messages, { role: "assistant", text }];
}

export function safeAgentError(error: unknown, secret: string): string {
  let message = error instanceof Error ? error.message : String(error);
  if (secret) message = message.replaceAll(secret, "[redacted]");
  return message.slice(0, 1500);
}
