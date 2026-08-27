export type AgentId = string & { readonly __brand: "AgentId" };

export type AgentStatus =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "composing" }
  | { kind: "awaiting-you" }
  | { kind: "unread"; count: number };

export type Bot = {
  id: AgentId;
  name: string;
  title: string;
  description: string;
  isGroup: boolean;
  isHidden: boolean;
  status: AgentStatus;
  lastPreview: string | null;
  avatarColor: string | null;
  avatarHash: string | null;
};

export type Preferences = {
  gatewayUrl: string;
  gatewayToken: string;
};

export type GatewayError =
  | { kind: "not-configured" }
  | { kind: "credentials-file"; detail: string }
  | { kind: "unreachable"; cause: string }
  | { kind: "unauthorized" }
  | { kind: "rejected"; status: number; body: string }
  | { kind: "invalid-response"; detail: string };

export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

export function parseAgentId(raw: unknown): Result<AgentId, string> {
  if (typeof raw !== "string") {
    return err("id must be a string");
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return err("id must not be empty");
  }
  return ok(trimmed as AgentId);
}

export function statusLabel(status: AgentStatus): string {
  switch (status.kind) {
    case "awaiting-you":
      return "Needs you";
    case "running":
      return "Working";
    case "composing":
      return "Typing";
    case "unread":
      return status.count === 1 ? "1 unread" : `${status.count} unread`;
    case "idle":
      return "";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function gatewayErrorMessage(error: GatewayError): string {
  switch (error.kind) {
    case "not-configured":
      return "Set Gateway URL and token in extension preferences, or in ~/.config/grok-bot-raycast/gateway.env.";
    case "credentials-file":
      return `Can't use ~/.config/grok-bot-raycast/gateway.env. ${error.detail}`;
    case "unreachable":
      return `Gateway unreachable. ${error.cause}`;
    case "unauthorized":
      return "Gateway token rejected. Check extension preferences.";
    case "rejected":
      return `Gateway returned ${error.status}. ${error.body}`;
    case "invalid-response":
      return `Invalid gateway response. ${error.detail}`;
    default: {
      const _exhaustive: never = error;
      return _exhaustive;
    }
  }
}
