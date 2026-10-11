import { LocalStorage } from "@raycast/api";
import { ChatMessage } from "./calypso";

/**
 * Persistent chat history.
 *
 * Conversations are stored one key per conversation plus a small index, rather
 * than as a single blob. Raycast's LocalStorage is a key/value store with no
 * partial reads, so one blob would mean loading and rewriting every past chat
 * on each turn — which gets slower the longer the history gets, exactly when
 * you least want it to.
 *
 * The index holds only what the list view needs to render, so opening history
 * never deserialises transcripts you aren't going to read.
 */

const INDEX_KEY = "calypso-chat-index";
const CONV_PREFIX = "calypso-chat-conv-";
/** Cap on stored conversations. Oldest are evicted; the store is not a vault. */
const MAX_CONVERSATIONS = 100;

export interface Turn {
  question: string;
  answer: string;
  reasoning: string;
  tools: string[];
  endpoint?: string;
  error?: string;
  streaming: boolean;
}

export interface ConversationMeta {
  id: string;
  title: string;
  /** Epoch ms. Kept as a number so sorting needs no date parsing. */
  updatedAt: number;
  turnCount: number;
}

export interface Conversation extends ConversationMeta {
  turns: Turn[];
  history: ChatMessage[];
}

export function newConversationId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** First question, trimmed to something that fits a list row. */
export function titleFrom(turns: Turn[]): string {
  const first = turns.find((t) => t.question.trim())?.question.trim() ?? "";
  if (!first) return "Empty conversation";
  return first.length > 60 ? `${first.slice(0, 57)}…` : first;
}

export async function readIndex(): Promise<ConversationMeta[]> {
  try {
    const raw = await LocalStorage.getItem<string>(INDEX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ConversationMeta[]) : [];
  } catch {
    // A corrupt index must not brick the command; an empty history is recoverable.
    return [];
  }
}

async function writeIndex(index: ConversationMeta[]): Promise<void> {
  await LocalStorage.setItem(INDEX_KEY, JSON.stringify(index));
}

export async function loadConversation(id: string): Promise<Conversation | null> {
  try {
    const raw = await LocalStorage.getItem<string>(CONV_PREFIX + id);
    if (!raw) return null;
    const c = JSON.parse(raw) as Conversation;
    if (!Array.isArray(c.turns) || !Array.isArray(c.history)) return null;
    // A conversation saved mid-stream would otherwise reload stuck on "thinking…".
    c.turns = c.turns.map((t) => ({ ...t, streaming: false }));
    return c;
  } catch {
    return null;
  }
}

export async function saveConversation(id: string, turns: Turn[], history: ChatMessage[]): Promise<void> {
  if (turns.length === 0) return;

  const meta: ConversationMeta = {
    id,
    title: titleFrom(turns),
    updatedAt: Date.now(),
    turnCount: turns.length,
  };

  await LocalStorage.setItem(CONV_PREFIX + id, JSON.stringify({ ...meta, turns, history }));

  const index = (await readIndex()).filter((m) => m.id !== id);
  index.unshift(meta);

  // Evict the oldest beyond the cap, and delete their payloads too — an index
  // entry without its conversation is a dead row in the history list.
  const kept = index.slice(0, MAX_CONVERSATIONS);
  for (const dropped of index.slice(MAX_CONVERSATIONS)) {
    await LocalStorage.removeItem(CONV_PREFIX + dropped.id);
  }
  await writeIndex(kept);
}

export async function deleteConversation(id: string): Promise<void> {
  await LocalStorage.removeItem(CONV_PREFIX + id);
  await writeIndex((await readIndex()).filter((m) => m.id !== id));
}

export async function clearAllConversations(): Promise<void> {
  for (const m of await readIndex()) {
    await LocalStorage.removeItem(CONV_PREFIX + m.id);
  }
  await LocalStorage.removeItem(INDEX_KEY);
}

/** Render a conversation as markdown, for copy/export. */
export function conversationToMarkdown(c: Conversation): string {
  const lines = [`# ${c.title}`, ""];
  for (const t of c.turns) {
    lines.push(`## ${t.question}`, "");
    if (t.tools.length) lines.push("```", ...t.tools, "```", "");
    lines.push(t.answer || "_(no answer)_", "");
  }
  return lines.join("\n");
}
