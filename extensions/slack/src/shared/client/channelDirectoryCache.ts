import { Cache } from "@raycast/api";
import { createHash } from "node:crypto";
import type { SlackConversation } from "./slackTypes";
import { planMemberDirectoryRead } from "./memberDirectoryRefresh";

type Snapshot = { savedAt: number; conversations: SlackConversation[]; pages?: SlackConversation[][] };

type FetchPage = (cursor?: string) => Promise<{ items: SlackConversation[]; nextCursor?: string }>;

type Load = {
  pages: SlackConversation[][];
  finished: boolean;
  error?: unknown;
  failedAt?: number;
  listeners: Set<() => void>;
};

/** `savedAt` is set when the page came from a snapshot rather than from a scan that is still running. */
export type ConversationPage = { items: SlackConversation[]; hasMore: boolean; error?: unknown; savedAt?: number };

export type ConversationPageOptions = {
  /** Treats an older snapshot as missing and reads a new scan instead, for a search that must not miss new channels. */
  maxAgeMs?: number;
};

const cache = new Cache({ namespace: "channel-directory", capacity: 20 * 1024 * 1024 });

/** Keeps only the fields channel rows and mention search read, so snapshots stay small and fast to parse. */
export function slimConversation(conversation: SlackConversation): SlackConversation {
  return {
    id: conversation.id,
    name: conversation.name,
    shared_team_ids: conversation.shared_team_ids,
    internal_team_ids: conversation.internal_team_ids,
    context_team_id: conversation.context_team_id,
    is_private: conversation.is_private,
    is_mpim: conversation.is_mpim,
    is_im: conversation.is_im,
    is_archived: conversation.is_archived,
    is_member: conversation.is_member,
    topic: conversation.topic?.value ? { value: conversation.topic.value } : undefined,
    purpose: conversation.purpose?.value ? { value: conversation.purpose.value } : undefined,
  };
}

/**
 * A conversation directory that is scanned at most once per hour and shared across all searches, so a search can
 * filter locally as pages arrive instead of restarting a full directory walk on each keystroke.
 */
function createConversationDirectory(name: string) {
  const memory = new Map<string, Snapshot>();
  const loads = new Map<string, Load>();

  function keyFor(token: string | undefined) {
    return `${name}:${createHash("sha256")
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
      if (!Array.isArray(snapshot.conversations)) return undefined;
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
          load.pages.push(page.items.map(slimConversation));
          notify();
          cursor = page.nextCursor || undefined;
        } while (cursor);
        write(key, load.pages);
      } catch (error) {
        console.error(`[${name}] Scan failed:`, error);
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

  /** Returns page `index` of the directory. A stale snapshot is served while a refresh runs in the background. */
  return async function getPage(
    token: string | undefined,
    fetchPage: FetchPage,
    index: number,
    options: ConversationPageOptions = {},
  ): Promise<ConversationPage> {
    const key = keyFor(token);
    const snapshot = read(key);
    const now = Date.now();
    const age = snapshot ? now - snapshot.savedAt : Infinity;
    const plan = planMemberDirectoryRead({
      // A snapshot past `maxAgeMs` is read like a cold cache: join or start a scan. The new snapshot keeps that scan's
      // page layout in memory, so a search that started on the scan keeps reading by page index after it finishes.
      hasSnapshot: snapshot !== undefined && age < (options.maxAgeMs ?? Infinity),
      snapshotAgeMs: age,
      load: loads.get(key),
      now,
    });

    if (plan.discardFailedLoad) loads.delete(key);
    if (plan.serve === "fresh" && snapshot) {
      const pages = snapshot.pages ?? [snapshot.conversations];
      return { items: pages[index] ?? [], hasMore: index + 1 < pages.length, savedAt: snapshot.savedAt };
    }

    if (plan.startLoad && !loads.has(key)) startLoad(key, fetchPage);
    if (plan.serve === "stale" && snapshot) {
      return { items: index === 0 ? snapshot.conversations : [], hasMore: false, savedAt: snapshot.savedAt };
    }

    const load = loads.get(key);
    if (!load) throw new Error("Channel directory is unavailable");
    return readLoadPage(load, index);
  };
}

/** Every channel and group DM visible to the signed-in user (conversations.list), for Open Channel and mentions. */
export const getConversationPage = createConversationDirectory("channel-directory");

/** The channels the signed-in user belongs to (users.conversations), for the default Channels mention list. */
export const getMemberChannelPage = createConversationDirectory("member-channel-directory");
