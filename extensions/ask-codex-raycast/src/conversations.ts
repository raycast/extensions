export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  kind?: "message" | "steer";
  status?: "streaming" | "complete" | "error";
};

export type StoredConversation = {
  threadId: string | null;
  messages: ChatMessage[];
  title?: string;
  draft?: string;
  updatedAt?: number;
  archived?: boolean;
  cwd?: string;
};

export type ConversationLibrary = {
  version: 2;
  activeId: string | null;
  sessions: StoredConversation[];
};

export const LEGACY_KEY = "ask-codex.current-conversation.v1";
export const LIBRARY_KEY = "ask-codex.conversations.v2";
export const emptyConversation = (): StoredConversation => ({
  threadId: null,
  messages: [],
});
export const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
export const asString = (value: unknown): string =>
  typeof value === "string" ? value : "";
export const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : String(error);
export const makeId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function parseConversation(value: unknown): StoredConversation {
  const data = asRecord(value);
  return {
    threadId: asString(data.threadId) || null,
    messages: Array.isArray(data.messages)
      ? data.messages.filter((item): item is ChatMessage => {
          const message = asRecord(item);
          return (
            typeof message.id === "string" &&
            typeof message.content === "string" &&
            (message.role === "user" || message.role === "assistant")
          );
        })
      : [],
    title: asString(data.title),
    draft: asString(data.draft),
    cwd: asString(data.cwd),
    updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : 0,
    archived: data.archived === true,
  };
}

export function parseLibrary(
  value?: string,
  legacy?: string,
): ConversationLibrary {
  if (value) {
    const data = asRecord(JSON.parse(value));
    if (data.version !== 2 || !Array.isArray(data.sessions))
      throw new Error("会话记录格式无法识别，原记录已保留，请勿清除扩展数据。");
    return {
      version: 2,
      activeId: asString(data.activeId) || null,
      sessions: data.sessions
        .map(parseConversation)
        .filter((session) => session.threadId),
    };
  }
  const previous = legacy
    ? parseConversation(JSON.parse(legacy))
    : emptyConversation();
  return {
    version: 2,
    activeId: previous.threadId,
    sessions: previous.threadId ? [previous] : [],
  };
}

export function upsertConversation(
  library: ConversationLibrary,
  session: StoredConversation,
  activate = true,
): ConversationLibrary {
  if (!session.threadId) return library;
  const exists = library.sessions.some(
    (item) => item.threadId === session.threadId,
  );
  return {
    ...library,
    activeId: activate ? session.threadId : library.activeId,
    sessions: exists
      ? library.sessions.map((item) =>
          item.threadId === session.threadId ? session : item,
        )
      : [...library.sessions, session],
  };
}

export function conversationTitle(session: StoredConversation): string {
  return (
    session.title?.trim() ||
    session.messages
      .find((item) => item.role === "user")
      ?.content.replace(/\s+/g, " ")
      .slice(0, 70) ||
    "新对话"
  );
}

export function filterSessions(
  sessions: StoredConversation[],
  query: string,
  archived = false,
) {
  const needle = query.trim().toLocaleLowerCase();
  return sessions
    .filter(
      (session) =>
        Boolean(session.archived) === archived &&
        (!needle ||
          `${conversationTitle(session)}\n${session.messages.map((item) => item.content).join("\n")}`
            .toLocaleLowerCase()
            .includes(needle)),
    )
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

export function latestRound(messages: ChatMessage[]): ChatMessage[] {
  for (let index = messages.length - 1; index >= 0; index--) {
    if (messages[index].role === "user" && messages[index].kind !== "steer")
      return messages.slice(index);
  }
  return messages;
}

export function messagesFromThread(thread: unknown): ChatMessage[] {
  const turns = asRecord(thread).turns;
  if (!Array.isArray(turns)) return [];
  const messages: ChatMessage[] = [];
  for (const rawTurn of turns) {
    const turn = asRecord(rawTurn);
    if (!Array.isArray(turn.items)) continue;
    let userSeen = false;
    for (const rawItem of turn.items) {
      const item = asRecord(rawItem);
      if (item.type === "userMessage") {
        const content = Array.isArray(item.content)
          ? item.content
              .map((raw) => {
                const input = asRecord(raw);
                if (input.type === "text") return asString(input.text);
                if (input.type === "image" || input.type === "localImage")
                  return "[图片]";
                return "";
              })
              .filter(Boolean)
              .join("\n")
          : "";
        messages.push({
          id: asString(item.id) || makeId(),
          role: "user",
          content,
          kind: userSeen ? "steer" : "message",
          status: "complete",
        });
        userSeen = true;
      } else if (item.type === "agentMessage") {
        messages.push({
          id: asString(item.id) || makeId(),
          role: "assistant",
          content: asString(item.text),
          status: turn.status === "inProgress" ? "streaming" : "complete",
        });
      }
    }
  }
  return messages;
}

export function transcript(messages: ChatMessage[]): string {
  if (!messages.length)
    return "# 新对话\n\n在顶部输入问题并按 Enter 发送。对话记录会一直保留在这里。\n\nCodex 回答过程中也可以继续输入，按 Enter 发送补充要求。";
  return messages
    .map((message) => {
      const heading =
        message.role === "assistant"
          ? "Codex"
          : message.kind === "steer"
            ? "补充要求"
            : "你";
      const body =
        message.role === "user"
          ? message.content
              .split("\n")
              .map((line) => `> ${line}`)
              .join("\n")
          : message.content ||
            (message.status === "streaming"
              ? "_正在思考…_"
              : "_本轮没有文字回答。_");
      return `### ${heading}\n\n${body}`;
    })
    .join("\n\n---\n\n");
}
