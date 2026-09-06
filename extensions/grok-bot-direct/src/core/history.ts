import { Entry, entryAuthor, entryText } from "./messages";
import type { GrokClient, Transcript } from "./client";
import { renderRichText } from "./rich-text";

export interface ReplyThread {
  rootId: string;
  title: string;
  replyCount: number;
  lastActivity: number;
}
export interface HistorySnapshot {
  entries: Entry[];
  before?: number;
  loaded: boolean;
  error?: string;
  updatedAt?: number;
}
export const EMPTY_HISTORY: HistorySnapshot = { entries: [], loaded: false };

/** Merge authoritative updates by identity without losing older loaded pages. */
export function mergeHistory(
  existing: Entry[],
  incoming: Entry[],
  older = false,
): Entry[] {
  const ordered = older
    ? [...incoming, ...existing]
    : [...existing, ...incoming];
  const entries = new Map(ordered.map((entry) => [entry.id, entry]));
  for (const entry of incoming) entries.set(entry.id, entry);
  return [...entries.values()].sort((a, b) => {
    if (typeof a.timestampMs === "number" && typeof b.timestampMs === "number")
      return a.timestampMs - b.timestampMs;
    const left = /^t(\d+)/.exec(a.id),
      right = /^t(\d+)/.exec(b.id);
    return left && right ? Number(left[1]) - Number(right[1]) : 0;
  });
}
export function plainPreview(text: string): string {
  return text
    .replace(/```[^\n]*\n[\s\S]*?```/g, " [Code] ")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/(^|\s)[#>*_`]+/g, "$1")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}

/** Only index server-recorded reply relationships; never invent independent chats. */
export function replyThreads(entries: Entry[]): ReplyThread[] {
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const threads = new Map<string, ReplyThread>();
  for (const entry of entries) {
    if (typeof entry.replyTo !== "string") continue;
    let rootId = entry.replyTo;
    const seen = new Set([entry.id]);
    while (rootId) {
      if (seen.has(rootId)) {
        rootId = "";
        break;
      }
      seen.add(rootId);
      const parent = byId.get(rootId);
      if (typeof parent?.replyTo !== "string") break;
      rootId = parent.replyTo;
    }
    if (!rootId) continue;
    const root = byId.get(rootId);
    const thread = threads.get(rootId) ?? {
      rootId,
      title: root
        ? plainPreview(entryText(root)) || "Reply thread"
        : "Thread from earlier history",
      replyCount: 0,
      lastActivity: 0,
    };
    thread.replyCount++;
    thread.lastActivity = Math.max(thread.lastActivity, entry.timestampMs ?? 0);
    threads.set(rootId, thread);
  }
  return [...threads.values()].sort((a, b) => b.lastActivity - a.lastActivity);
}
export function escapeLabel(text: string): string {
  return text
    .replace(/([\\`*_{}[\]()#+.!|>~-])/g, "\\$1")
    .replace(/[\r\n]+/g, " ");
}

/** Keep response Markdown, code whitespace, and LaTeX verbatim. */
export function transcriptMarkdown(
  entries: Entry[],
  botName: string,
  title: string,
): string {
  const messages = entries.filter(
    (entry) =>
      entry.kind === "message" ||
      entry.kind === "send-message" ||
      entry.kind === "user-attachment",
  );
  const blocks = messages.map((entry) => {
    const stamp =
      typeof entry.timestampMs === "number" &&
      Number.isFinite(entry.timestampMs)
        ? new Date(entry.timestampMs).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })
        : "";
    const sender = entryAuthor(entry, botName);
    const label = `${sender === "You" ? "You" : escapeLabel(sender)}${stamp ? ` · ${stamp}` : ""}`;
    return `**${label}**\n\n${renderRichText(entryText(entry))}${entry.isStreaming === true ? "\n\n*Responding…*" : ""}`;
  });
  return `# ${escapeLabel(title)}\n\n${blocks.length ? blocks.join("\n\n---\n\n") : "No messages in this conversation yet."}`;
}

/** Session-local cache: switching bots or threads does not discard loaded history. */
export class HistoryStore {
  private values = new Map<string, HistorySnapshot>();
  private listeners = new Map<string, Set<() => void>>();
  private flights = new Map<string, Promise<void>>();
  private generation = 0;
  constructor(
    private readonly client: Pick<GrokClient, "transcript" | "thread">,
  ) {}
  private key(botId: string, rootId?: string): string {
    return JSON.stringify([botId, rootId ?? null]);
  }
  read(botId: string, rootId?: string): HistorySnapshot {
    return this.values.get(this.key(botId, rootId)) ?? EMPTY_HISTORY;
  }
  subscribe(
    botId: string,
    rootId: string | undefined,
    listener: () => void,
  ): () => void {
    const key = this.key(botId, rootId);
    const group = this.listeners.get(key) ?? new Set();
    group.add(listener);
    this.listeners.set(key, group);
    return () => {
      group.delete(listener);
      if (!group.size) this.listeners.delete(key);
    };
  }
  clear(): void {
    this.generation++;
    this.values.clear();
    this.flights.clear();
    for (const group of this.listeners.values())
      for (const listener of group) listener();
  }
  async load(botId: string, rootId?: string, older = false): Promise<void> {
    const key = this.key(botId, rootId);
    const running = this.flights.get(key);
    if (running) return running;
    const previous = this.read(botId, rootId);
    if (older && (rootId || previous.before === undefined)) return;
    const generation = this.generation;
    const execute = async (): Promise<void> => {
      try {
        const page: Transcript = rootId
          ? await this.client.thread(botId, rootId)
          : await this.client.transcript(
              botId,
              older ? previous.before : undefined,
            );
        if (generation !== this.generation) return;
        const current = this.read(botId, rootId);
        this.values.set(key, {
          entries: mergeHistory(current.entries, page.entries, older),
          before:
            older || !current.loaded ? page.nextBeforeSeq : current.before,
          loaded: true,
          updatedAt: Date.now(),
        });
      } catch (error) {
        if (generation === this.generation)
          this.values.set(key, {
            ...this.read(botId, rootId),
            error:
              error instanceof Error
                ? error.message
                : "Could not load conversation.",
          });
      } finally {
        if (generation === this.generation) {
          this.flights.delete(key);
          for (const listener of this.listeners.get(key) ?? []) listener();
          // Keep the active conversations and at most eight inactive cache entries.
          const inactive = [...this.values.keys()].filter(
            (candidate) => !this.listeners.has(candidate),
          );
          for (const stale of inactive.slice(
            0,
            Math.max(0, inactive.length - 8),
          ))
            this.values.delete(stale);
        }
      }
    };
    const flight = execute();
    this.flights.set(key, flight);
    return flight;
  }
}
