import { Bot, AgentStatus, parseAgentId, err, ok, Result } from "./types";

function readBoolean(value: unknown): boolean {
  return value === true;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function readNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function isAwaitingYou(value: unknown): boolean {
  if (value === true) {
    return true;
  }
  if (value === false || value == null) {
    return false;
  }
  return typeof value === "object";
}

function deriveStatus(raw: Record<string, unknown>): AgentStatus {
  const awaitingUserResponse = isAwaitingYou(raw.awaitingUserResponse);
  const isRunning = readBoolean(raw.isRunning);
  const isComposingMessage = readBoolean(raw.isComposingMessage);
  const hasUnread = readBoolean(raw.hasUnread);
  const unreadCount = readNumber(raw.unreadCount);

  if (awaitingUserResponse) {
    return { kind: "awaiting-you" };
  }
  if (isRunning) {
    return { kind: "running" };
  }
  if (isComposingMessage) {
    return { kind: "composing" };
  }
  if (hasUnread && unreadCount > 0) {
    return { kind: "unread", count: unreadCount };
  }
  return { kind: "idle" };
}

function readAvatarHash(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  if (!/^[a-f0-9]{16}$/.test(value)) {
    return null;
  }
  return value;
}

function readAvatarColor(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (/^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(trimmed)) {
    return trimmed;
  }
  if (/^(?:rgb|hsl)a?\([^)]{1,64}\)$/i.test(trimmed)) {
    return trimmed;
  }
  return null;
}

export function parseBot(raw: unknown): Result<Bot, string> {
  if (typeof raw !== "object" || raw === null) {
    return err("agent must be an object");
  }

  const record = raw as Record<string, unknown>;
  const idResult = parseAgentId(record.id);
  if (!idResult.ok) {
    return err(idResult.error);
  }

  return ok({
    id: idResult.value,
    name: readString(record.name),
    title: readString(record.title),
    description: readString(record.description),
    isGroup: readBoolean(record.isGroup),
    isHidden: readBoolean(record.isHiddenFromSidebar),
    status: deriveStatus(record),
    lastPreview: readNullableString(record.lastMessagePreview),
    avatarColor: readAvatarColor(record.avatarColor),
    avatarHash: readAvatarHash(record.avatarHash),
  });
}

export function parseAgentList(raw: unknown): Result<Bot[], string> {
  if (!Array.isArray(raw)) {
    return err("expected an array of agents");
  }

  const bots: Bot[] = [];
  let firstError = "";
  for (const item of raw) {
    const parsed = parseBot(item);
    if (!parsed.ok) {
      if (firstError.length === 0) {
        firstError = parsed.error;
      }
      continue;
    }
    bots.push(parsed.value);
  }

  if (bots.length === 0 && raw.length > 0) {
    return err(firstError);
  }

  return ok(bots);
}
