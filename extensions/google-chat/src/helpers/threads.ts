/** The Send Message form's "Thread" dropdown: choices and recent-thread options. Pure: no Raycast imports. */

import type { Message, Space } from "../api/types";
import { truncate, type UserNames } from "./chat-format";
import { messageSnippet, senderName } from "./message-view";
import { parseThread } from "./recipient";

/** Start a new message, reply in a known thread, or paste a thread link. */
export type ThreadChoice = { kind: "new" } | { kind: "paste" } | { kind: "thread"; name: string };

export const NEW_THREAD_VALUE = "new";
export const PASTE_THREAD_VALUE = "paste";

/** Dropdown value: `new`, `paste`, or `thread:spaces/AAAA/threads/BBBB`. */
export function encodeThreadChoice(choice: ThreadChoice): string {
  if (choice.kind === "thread") return `thread:${choice.name}`;
  return choice.kind === "paste" ? PASTE_THREAD_VALUE : NEW_THREAD_VALUE;
}

/**
 * Reads a dropdown value back. A bare thread reference (a draft from older versions stored the
 * link itself) becomes that thread; anything unrecognised means a new message.
 */
export function decodeThreadChoice(value: string | undefined): ThreadChoice {
  const raw = value?.trim();
  if (!raw || raw === NEW_THREAD_VALUE) return { kind: "new" };
  if (raw === PASTE_THREAD_VALUE) return { kind: "paste" };
  try {
    const name = parseThread(raw.startsWith("thread:") ? raw.slice("thread:".length) : raw);
    return name ? { kind: "thread", name } : { kind: "new" };
  } catch {
    return { kind: "new" };
  }
}

/**
 * Which recent threads to offer. Named spaces: every thread. DMs and group chats: only threads that
 * already have replies (replying by `thread.name` is only documented for named spaces). Spaces
 * without threading: none.
 */
export type ThreadMode = "all" | "withReplies" | "none";

export function threadMode(space: Pick<Space, "spaceType" | "spaceThreadingState">): ThreadMode {
  if (space.spaceThreadingState === "UNTHREADED_MESSAGES") return "none";
  return space.spaceType === "SPACE" ? "all" : "withReplies";
}

/** `just now`, `5m ago`, `3h ago`, `2d ago`, `3w ago`, else the date (`2026-08-01`). */
export function relativeTime(value: string | undefined, now: number = Date.now()): string {
  const at = value ? Date.parse(value) : NaN;
  if (Number.isNaN(at)) return "";
  const minutes = Math.floor(Math.max(0, now - at) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 56) return `${Math.floor(days / 7)}w ago`;
  return new Date(at).toISOString().slice(0, 10);
}

export interface ThreadOption {
  /** Dropdown value (`thread:spaces/AAAA/threads/BBBB`). */
  value: string;
  /** `spaces/AAAA/threads/BBBB` */
  name: string;
  /** First ~60 characters of the thread's latest message, its sender and when. */
  title: string;
  latestTime?: string;
}

/** `Can you review the PR? — Sara Khan · 2h ago` */
export function threadLabel(latest: Message, names: UserNames = {}, now: number = Date.now()): string {
  const when = relativeTime(latest.createTime, now);
  return `${truncate(messageSnippet(latest, names), 60)} — ${senderName(latest, names)}${when ? ` · ${when}` : ""}`;
}

/**
 * Recent threads from a space's messages: one option per distinct `thread.name`, labelled with its
 * latest message, newest thread first, at most `limit`.
 */
export function buildThreadOptions(
  messages: Message[],
  options: { mode: ThreadMode; names?: UserNames; limit?: number; now?: number },
): ThreadOption[] {
  const { mode, names = {}, limit = 20, now = Date.now() } = options;
  if (mode === "none") return [];
  const sorted = [...messages].sort(
    (a, b) => (Date.parse(b.createTime ?? "") || 0) - (Date.parse(a.createTime ?? "") || 0),
  );
  const latestByThread = new Map<string, Message>();
  const withReplies = new Set<string>();
  for (const message of sorted) {
    const thread = message.thread?.name;
    if (!thread) continue;
    if (!latestByThread.has(thread)) latestByThread.set(thread, message);
    if (message.threadReply) withReplies.add(thread);
  }
  return [...latestByThread.entries()]
    .filter(([thread]) => mode === "all" || withReplies.has(thread))
    .slice(0, limit)
    .map(([thread, latest]) => ({
      value: encodeThreadChoice({ kind: "thread", name: thread }),
      name: thread,
      title: threadLabel(latest, names, now),
      latestTime: latest.createTime,
    }));
}
