import { Cache } from "@raycast/api";
import { createHash } from "node:crypto";
import type { SlackConversation } from "./slackTypes";
import { planMemberDirectoryRead } from "./memberDirectoryRefresh";

type Snapshot = { savedAt: number; conversations: SlackConversation[]; pages?: SlackConversation[][] };

const cache = new Cache({ namespace: "channel-directory", capacity: 20 * 1024 * 1024 });
const memory = new Map<string, Snapshot>();

function keyFor(token: string | undefined) {
  return `channel-directory:${createHash("sha256")
    .update(token ?? "")
    .digest("hex")
    .slice(0, 16)}`;
}

function read(key: string): Snapshot | undefined {
  const hit = memory.get(key);
  if (hit) return hit;
  try {
    const raw = cache.get(key);
    if (!raw) return undefined;
    const snapshot = JSON.parse(raw) as Snapshot;
    memory.set(key, snapshot);
    return snapshot;
  } catch {
    return undefined;
  }
}

function write(key: string, pages: SlackConversation[][]) {
  const snapshot = { savedAt: Date.now(), conversations: pages.flat() };
  memory.set(key, { ...snapshot, pages });
  try {
    cache.set(key, JSON.stringify(snapshot));
  } catch {
    // Persistence is best-effort; the in-memory copy still serves this session.
  }
}

type FetchPage = (cursor?: string) => Promise<{ items: SlackConversation[]; nextCursor?: string }>;

type Load = {
  pages: SlackConversation[][];
  finished: boolean;
  error?: unknown;
  failedAt?: number;
  listeners: Set<() => void>;
};

const loads = new Map<string, Load>();

function startLoad(key: string, fetchPage: FetchPage): Load {
  const load: Load = { pages: [], finished: false, listeners: new Set() };
  const notify = () => {
    const listeners = [...load.listeners];
    load.listeners.clear();
    listeners.forEach((listener) => listener());
  };
  loads.set(key, load);
  void (async () => {
    try {
      let cursor: string | undefined;
      do {
        const page = await fetchPage(cursor);
        load.pages.push(page.items);
        notify();
        cursor = page.nextCursor || undefined;
      } while (cursor);
      write(key, load.pages);
    } catch (error) {
      console.error("[channel-directory] Scan failed:", error);
      load.error = error;
      load.failedAt = Date.now();
    } finally {
      load.finished = true;
      if (!load.error) loads.delete(key);
      notify();
    }
  })();
  return load;
}

async function readLoadPage(load: Load, index: number): Promise<ConversationPage> {
  for (;;) {
    const items = load.pages[index];
    if (items) {
      const hasMore = index + 1 < load.pages.length || !load.finished;
      return { items, hasMore, error: !hasMore && load.error ? load.error : undefined };
    }
    if (load.finished) {
      if (load.error) throw load.error;
      return { items: [], hasMore: false };
    }
    await new Promise<void>((resolve) => load.listeners.add(resolve));
  }
}

export type ConversationPage = { items: SlackConversation[]; hasMore: boolean; error?: unknown };

/**
 * Returns page `index` of the full workspace channel + group directory. conversations.list is scanned at most once
 * per hour and shared across all searches, so channel search can filter locally as pages arrive instead of restarting
 * a full directory scan on each keystroke.
 */
export async function getConversationPage(
  token: string | undefined,
  fetchPage: FetchPage,
  index: number,
): Promise<ConversationPage> {
  const key = keyFor(token);
  const snapshot = read(key);
  const now = Date.now();
  const age = snapshot ? now - snapshot.savedAt : Infinity;
  const plan = planMemberDirectoryRead({
    hasSnapshot: snapshot !== undefined,
    snapshotAgeMs: age,
    load: loads.get(key),
    now,
  });

  if (plan.discardFailedLoad) loads.delete(key);
  if (plan.serve === "fresh" && snapshot) {
    const pages = snapshot.pages ?? [snapshot.conversations];
    return { items: pages[index] ?? [], hasMore: index + 1 < pages.length };
  }

  if (plan.startLoad && !loads.has(key)) startLoad(key, fetchPage);
  if (plan.serve === "stale" && snapshot) return { items: index === 0 ? snapshot.conversations : [], hasMore: false };

  const load = loads.get(key);
  if (!load) throw new Error("Channel directory is unavailable");
  return readLoadPage(load, index);
}
