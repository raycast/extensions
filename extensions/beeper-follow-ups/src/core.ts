import type BeeperDesktop from "@beeper/desktop-api";

export type Chat = BeeperDesktop.Chat;
export type Message = BeeperDesktop.Message;
export interface ChatPage {
  items: Chat[];
  hasMore: boolean;
  oldestCursor: string | null;
}
export interface MessagePage {
  items: Message[];
  hasMore: boolean;
  oldestCursor: string | null;
}
export interface ReplyClient {
  searchChats(params: {
    inbox: "primary";
    type: "single";
    lastActivityAfter: string;
    includeMuted: boolean;
    limit: number;
    cursor?: string;
    direction?: "before";
  }): Promise<ChatPage>;
  listMessages(
    chatID: string,
    params?: { cursor: string; direction: "before" },
  ): Promise<MessagePage>;
  retrieveChat(
    chatID: string,
    params?: { maxParticipantCount: number },
  ): Promise<Chat>;
  focus(params: {
    chatID: string;
    messageID?: string;
    draftText?: string;
  }): Promise<{ success: boolean }>;
}
export type ReplyItem = { chat: Chat; message: Message };
export type ReplyQueue = {
  items: ReplyItem[];
  scanned: number;
  failed: number;
  inconclusive: number;
  hasMore: boolean;
};

export function validateBaseUrl(value: string): string {
  const url = new URL(value);
  if (
    url.protocol !== "http:" ||
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "Use a local HTTP Beeper API URL, such as http://localhost:23373.",
    );
  }
  return url.origin;
}

export function latestVisibleMessage(messages: Message[]): Message | undefined {
  return messages
    .filter(
      (m) =>
        !m.isHidden &&
        !m.isDeleted &&
        !["REACTION", "NOTICE"].includes(m.type ?? ""),
    )
    .sort(
      (a, b) =>
        Date.parse(b.timestamp) - Date.parse(a.timestamp) ||
        compareSortKeys(b.sortKey, a.sortKey),
    )[0];
}
function compareSortKeys(a: string, b: string): number {
  if (/^\d+$/.test(a) && /^\d+$/.test(b)) {
    const x = BigInt(a),
      y = BigInt(b);
    return x === y ? 0 : x > y ? 1 : -1;
  }
  return a.localeCompare(b, "en");
}

export async function loadReplyQueue(
  client: ReplyClient,
  days: number,
  includeMuted: boolean,
  now = Date.now(),
): Promise<ReplyQueue> {
  const chats: Chat[] = [];
  let cursor: string | undefined;
  let hasMore = false;
  const seen = new Set<string>();
  for (let page = 0; page < 4; page++) {
    const response = await client.searchChats({
      inbox: "primary",
      type: "single",
      lastActivityAfter: new Date(now - days * 86400000).toISOString(),
      includeMuted,
      limit: 50,
      ...(cursor ? { cursor, direction: "before" as const } : {}),
    });
    for (const chat of response.items) {
      if (
        !seen.has(chat.id) &&
        !chat.mergedIntoChatID &&
        chat.type === "single" &&
        !chat.isArchived &&
        !chat.isReadOnly &&
        (includeMuted || !chat.isMuted)
      ) {
        chats.push(chat);
        seen.add(chat.id);
      }
    }
    hasMore = response.hasMore;
    if (!hasMore || !response.oldestCursor) break;
    if (cursor === response.oldestCursor)
      throw new Error(
        "Beeper returned a repeated pagination cursor. Refresh and try again.",
      );
    cursor = response.oldestCursor;
  }
  const items: ReplyItem[] = [];
  let next = 0;
  let failed = 0;
  let inconclusive = 0;
  await Promise.all(
    Array.from({ length: Math.min(4, chats.length) }, async () => {
      while (next < chats.length) {
        const chat = chats[next++];
        try {
          const messages: Message[] = [];
          let complete = true;
          // A merged conversation has no messages of its own; inspect each member.
          for (const id of chat.merge?.chatIDs ?? [chat.id]) {
            const member = await client.retrieveChat(id, {
              maxParticipantCount: -1,
            });
            const participants = new Map(
              member.participants.items.map((participant) => [
                participant.id,
                participant,
              ]),
            );
            const participantsComplete =
              !member.participants.hasMore &&
              member.participants.items.length >= member.participants.total;
            const botSenders = new Set(
              member.participants.items
                .filter((participant) => participant.isNetworkBot === true)
                .map((participant) => participant.id),
            );
            let messageCursor: string | undefined;
            let foundCandidate = false;
            for (let page = 0; page < 3; page++) {
              const response = await client.listMessages(
                id,
                messageCursor
                  ? { cursor: messageCursor, direction: "before" }
                  : undefined,
              );
              // Service events can arrive as TEXT; discard positively identified
              // network bots before deciding whether this page has a candidate.
              const visible = latestVisibleMessage(
                response.items.filter(
                  (message) => !botSenders.has(message.senderID),
                ),
              );
              if (visible) {
                foundCandidate = true;
                const participant = participants.get(visible.senderID);
                if (
                  visible.isSender !== true &&
                  (visible.isSender !== false ||
                    !participantsComplete ||
                    !participant ||
                    participant.isSelf === true)
                ) {
                  complete = false;
                }
                messages.push(visible);
                break;
              }
              if (!response.hasMore) break;
              if (page === 2 || !response.oldestCursor) {
                complete = false;
                break;
              }
              if (response.oldestCursor === messageCursor)
                throw new Error("Repeated message cursor");
              messageCursor = response.oldestCursor;
            }
            if (!foundCandidate && !participantsComplete) complete = false;
          }
          // An unknown member can contain a newer outgoing message; don't classify it.
          if (!complete) {
            inconclusive++;
            continue;
          }
          const message = latestVisibleMessage(messages);
          // Explicit false avoids treating an unknown sender as an incoming message.
          if (message?.isSender === false) items.push({ chat, message });
        } catch {
          failed++;
        }
      }
    }),
  );
  items.sort(
    (a, b) => Date.parse(a.message.timestamp) - Date.parse(b.message.timestamp),
  );
  return { items, scanned: chats.length, failed, inconclusive, hasMore };
}

export function escapeMarkdown(value: string): string {
  return value.replace(/([\\`*_{}[\]()<>#+.!|~])/g, "\\$1");
}
export function messagePreview(item: ReplyItem): string {
  const { chat, message } = item;
  const body =
    message.text ||
    (message.attachments?.length
      ? `[${message.type?.toLowerCase() ?? "attachment"} message]`
      : "[Message has no text]");
  return `# ${escapeMarkdown(chat.title)}\n\n${escapeMarkdown(message.senderName || "Contact")} · ${escapeMarkdown(new Date(message.timestamp).toLocaleString())}\n\n${escapeMarkdown(body)}\n\n---\nLatest visible message came from this contact. This does not determine whether a reply is required.`;
}

export async function handoffDraft(
  client: ReplyClient,
  chatID: string,
  text: string,
): Promise<void> {
  if (!text.trim()) throw new Error("Add text to prepare a draft.");
  const current = await client.retrieveChat(chatID);
  if (current.isReadOnly)
    throw new Error("This conversation cannot receive messages.");
  if (
    current.draft &&
    (current.draft.text?.trim() ||
      Object.keys(current.draft.attachments ?? {}).length)
  ) {
    throw new Error(
      "This conversation already has a Beeper draft. Open it in Beeper to continue that draft first.",
    );
  }
  const result = await client.focus({ chatID, draftText: text });
  if (!result.success)
    throw new Error(
      "Beeper did not open the draft. Open the conversation in Beeper and try again.",
    );
}
