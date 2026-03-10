export type SessionContextType = "main" | "dm" | "group" | "channel" | "topic";

export type SessionContext = {
  type: SessionContextType;
  channel?: string;
  accountId?: string;
  peerId?: string;
  groupId?: string;
  roomId?: string;
  threadId?: string;
};

export type SessionKeyProfile = {
  agentId: string;
  mainKey?: string;
};

function sanitizeSegment(raw: string, fallback: string): string {
  const value = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return value || fallback;
}

export function normalizeSessionContext(
  context: SessionContext,
): SessionContext {
  const type = context.type;
  if (type === "main") {
    return { type: "main" };
  }
  if (type === "dm") {
    return {
      type,
      channel: sanitizeSegment(context.channel || "raycast", "raycast"),
      accountId: context.accountId
        ? sanitizeSegment(context.accountId, "default")
        : undefined,
      peerId: sanitizeSegment(context.peerId || "default", "default"),
    };
  }
  if (type === "group") {
    return {
      type,
      channel: sanitizeSegment(context.channel || "telegram", "telegram"),
      groupId: sanitizeSegment(context.groupId || "default", "default"),
      threadId: context.threadId
        ? sanitizeSegment(context.threadId, "default")
        : undefined,
    };
  }
  if (type === "channel") {
    return {
      type,
      channel: sanitizeSegment(context.channel || "telegram", "telegram"),
      roomId: sanitizeSegment(context.roomId || "default", "default"),
      threadId: context.threadId
        ? sanitizeSegment(context.threadId, "default")
        : undefined,
    };
  }
  return {
    type: "topic",
    channel: sanitizeSegment(context.channel || "telegram", "telegram"),
    groupId: context.groupId
      ? sanitizeSegment(context.groupId, "default")
      : undefined,
    roomId: context.roomId
      ? sanitizeSegment(context.roomId, "default")
      : undefined,
    threadId: sanitizeSegment(context.threadId || "default", "default"),
  };
}

export function createMainContext(): SessionContext {
  return { type: "main" };
}

export function buildSessionKeyForContext(
  profile: SessionKeyProfile,
  rawContext: SessionContext,
): string {
  const context = normalizeSessionContext(rawContext);
  const agentId = sanitizeSegment(profile.agentId || "main", "main");
  const mainKey = sanitizeSegment(profile.mainKey || "main", "main");
  const head = `agent:${agentId}`;

  if (context.type === "main") {
    return `${head}:${mainKey}`;
  }

  const channel = sanitizeSegment(context.channel || "raycast", "raycast");
  if (context.type === "dm") {
    const peerId = sanitizeSegment(context.peerId || "default", "default");
    const accountId = context.accountId
      ? sanitizeSegment(context.accountId, "default")
      : undefined;
    if (accountId) {
      return `${head}:${channel}:${accountId}:dm:${peerId}`;
    }
    return `${head}:${channel}:dm:${peerId}`;
  }

  if (context.type === "group") {
    const groupId = sanitizeSegment(context.groupId || "default", "default");
    const topicSuffix = context.threadId
      ? `:topic:${sanitizeSegment(context.threadId, "default")}`
      : "";
    return `${head}:${channel}:group:${groupId}${topicSuffix}`;
  }

  if (context.type === "channel") {
    const roomId = sanitizeSegment(context.roomId || "default", "default");
    const topicSuffix = context.threadId
      ? `:topic:${sanitizeSegment(context.threadId, "default")}`
      : "";
    return `${head}:${channel}:channel:${roomId}${topicSuffix}`;
  }

  const threadId = sanitizeSegment(context.threadId || "default", "default");
  if (context.groupId) {
    const groupId = sanitizeSegment(context.groupId, "default");
    return `${head}:${channel}:group:${groupId}:topic:${threadId}`;
  }
  if (context.roomId) {
    const roomId = sanitizeSegment(context.roomId, "default");
    return `${head}:${channel}:channel:${roomId}:topic:${threadId}`;
  }
  return `${head}:${channel}:group:default:topic:${threadId}`;
}

export function describeContext(context: SessionContext): string {
  const normalized = normalizeSessionContext(context);
  if (normalized.type === "main") {
    return "Main";
  }
  if (normalized.type === "dm") {
    const account = normalized.accountId ? `/${normalized.accountId}` : "";
    return `DM ${normalized.channel}${account} · ${normalized.peerId}`;
  }
  if (normalized.type === "group") {
    const topic = normalized.threadId ? ` · topic:${normalized.threadId}` : "";
    return `Group ${normalized.channel} · ${normalized.groupId}${topic}`;
  }
  if (normalized.type === "channel") {
    const topic = normalized.threadId ? ` · topic:${normalized.threadId}` : "";
    return `Channel ${normalized.channel} · ${normalized.roomId}${topic}`;
  }
  const base = normalized.groupId
    ? `group:${normalized.groupId}`
    : normalized.roomId
      ? `channel:${normalized.roomId}`
      : "group:default";
  return `Topic ${normalized.channel} · ${base} · ${normalized.threadId}`;
}
