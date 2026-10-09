import { Cache } from "@raycast/api";
import { createHash } from "node:crypto";
import type { SlackMember } from "./slackTypes";
import { toUserName } from "./member";

const FRESH_MS = 60 * 60 * 1000;
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** `pages` keeps the layout of the scan that produced the snapshot (in memory only), so a search that began on the live scan can finish reading it by page index after the scan completes. */
type Snapshot = { savedAt: number; members: SlackMember[]; pages?: SlackMember[][] };

const cache = new Cache({ capacity: 20 * 1024 * 1024 });
const memory = new Map<string, Snapshot>();

/** Keeps only fields used for search and for building User rows; drops deleted users and bots. */
export function slimMember(member: SlackMember): SlackMember | undefined {
  if (!toUserName(member)) return undefined;
  const { profile } = member;
  return {
    id: member.id,
    team_id: member.team_id,
    name: member.name,
    real_name: member.real_name,
    tz: member.tz,
    profile: profile && {
      real_name: profile.real_name,
      display_name: profile.display_name,
      email: profile.email,
      first_name: profile.first_name,
      last_name: profile.last_name,
      image_24: profile.image_24,
      title: profile.title,
      status_text: profile.status_text,
      status_emoji: profile.status_emoji,
      status_expiration: profile.status_expiration,
    },
  };
}

function keyFor(token: string | undefined) {
  return `member-directory:${createHash("sha256")
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

function write(key: string, pages: SlackMember[][]) {
  const snapshot = { savedAt: Date.now(), members: pages.flat() };
  memory.set(key, { ...snapshot, pages });
  try {
    cache.set(key, JSON.stringify(snapshot));
  } catch {
    // Persistence is best-effort; the in-memory copy still serves this session.
  }
}

type FetchPage = (cursor?: string) => Promise<{ items: SlackMember[]; nextCursor?: string }>;

/** One in-progress scan of users.list. Pages become readable as they arrive; the scan outlives any single search. */
type Load = { pages: SlackMember[][]; finished: boolean; error?: unknown; listeners: Set<() => void> };

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
        load.pages.push(page.items.flatMap((member) => slimMember(member) ?? []));
        notify();
        cursor = page.nextCursor || undefined;
      } while (cursor);
      write(key, load.pages);
    } catch (error) {
      load.error = error;
    } finally {
      load.finished = true;
      loads.delete(key);
      notify();
    }
  })();
  return load;
}

async function readLoadPage(load: Load, index: number): Promise<MemberPage> {
  for (;;) {
    const items = load.pages[index];
    if (items) {
      const hasMore = index + 1 < load.pages.length || !load.finished;
      // Fetched pages stay readable. A finished scan that stopped short reports that on its last page.
      return { items, hasMore, error: !hasMore && load.error ? load.error : undefined };
    }
    if (load.finished) {
      if (load.error) throw load.error;
      return { items: [], hasMore: false };
    }
    await new Promise<void>((resolve) => load.listeners.add(resolve));
  }
}

export type MemberPage = { items: SlackMember[]; hasMore: boolean; error?: unknown };

/**
 * Returns page `index` of the workspace member list. users.list is scanned at most once per hour and the scan is
 * shared by every search, so a search can read matches as pages arrive instead of waiting for the whole workspace.
 * A stale snapshot is served immediately while a refresh runs in the background; if a refresh fails, the stale
 * snapshot keeps working. Only a complete scan is cached.
 */
export async function getMemberPage(
  token: string | undefined,
  fetchPage: FetchPage,
  index: number,
): Promise<MemberPage> {
  const key = keyFor(token);
  const snapshot = read(key);
  const age = snapshot ? Date.now() - snapshot.savedAt : Infinity;
  if (snapshot && age < FRESH_MS) {
    const pages = snapshot.pages ?? [snapshot.members];
    return { items: pages[index] ?? [], hasMore: index + 1 < pages.length };
  }

  const load = loads.get(key) ?? startLoad(key, fetchPage);
  // A stale snapshot is served as one page: the refresh replaces it, and a page layout must not change mid-search.
  if (snapshot && age < MAX_AGE_MS) return { items: index === 0 ? snapshot.members : [], hasMore: false };
  return readLoadPage(load, index);
}
