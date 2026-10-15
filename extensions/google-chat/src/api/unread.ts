/**
 * Unread messages, from Chat's own per-message read state: `spaces.messages.search` with `is_unread()`
 * (100 per page, up to 500). If search is rejected, falls back to comparing each recently active
 * space's `spaceReadState.lastReadTime` with its messages.
 *
 * One result is shared through the Raycast cache by Unread Chat (which runs every 5 minutes), My Messages
 * and the AI tool, so background runs within 2 minutes of another search reuse its result.
 */

import { Cache, environment, launchCommand, LaunchType } from "@raycast/api";

import { defaultSleep, mapLimit } from "../helpers/backoff";
import {
  countUnread,
  freshSharedUnread,
  groupUnreadBySpace,
  isSpaceUnread,
  recentlyActiveSpaces,
  shouldFallBackFromSearch,
  UNREAD_CAP,
  UNREAD_PAGE_SIZE,
  unreadMessagesFilter,
  unreadSearchFilter,
  withoutSpaces,
  type SharedUnreadEntry,
  type UnreadGroup,
  type UnreadResult,
  countsAsUnread,
  excludeOwnMessages,
  messageSpaceName,
} from "../helpers/unread";
import { getSpace, getSpaceReadState, listMessages, markSpaceAsRead, searchMessages } from "./chat";
import { getMe } from "./people";
import { listSpacesSorted, resolveSpaceItems } from "./spaces";
import type { Message, Space, SpaceItem } from "./types";

const CONCURRENCY = 5;
const cache = new Cache({ namespace: "unread" });
const RESULT_KEY = "shared-result";
const PENDING_KEY = "search-started";
/** Background runs reuse a shared result younger than this. */
export const SHARED_MAX_AGE_MS = 2 * 60 * 1000;
/** Another command's search started less than this long ago is waited for instead of repeated. */
const PENDING_TTL_MS = 30 * 1000;
const PENDING_WAIT_MS = 15 * 1000;
/**
 * Commands whose root search subtitle shows the shared result; they're run in the background when it
 * changes (a new search or a mark-as-read elsewhere) so the subtitle follows.
 */
const UNREAD_SURFACES = ["unread-count"];

export interface UnreadSpace extends UnreadGroup {
  item: SpaceItem;
}

export type Unread = UnreadResult<UnreadSpace>;

/** Unread messages from `messages:search`, newest first, paging until there are no more or the cap is hit. */
async function searchUnread(lookbackDays: number): Promise<{ messages: Message[]; capped: boolean }> {
  const filter = unreadSearchFilter(lookbackDays);
  const messages: Message[] = [];
  let pageToken: string | undefined;
  do {
    let page;
    try {
      page = await searchMessages({ filter, pageSize: UNREAD_PAGE_SIZE, pageToken, orderBy: "create_time desc" });
    } catch (error) {
      // Google sometimes fails a later page with "Internal error encountered". Results are newest first, so the
      // pages already loaded hold the messages that matter; keep them and mark the total as a lower bound.
      if (messages.length === 0) throw error;
      console.error("Unread search page failed; keeping earlier pages", error);
      return { messages, capped: true };
    }
    for (const result of page.results ?? []) if (result.message) messages.push(result.message);
    pageToken = page.nextPageToken || undefined;
  } while (pageToken && messages.length < UNREAD_CAP);
  return { messages: messages.slice(0, UNREAD_CAP), capped: !!pageToken || messages.length > UNREAD_CAP };
}

/** Read positions (`spaceReadState.lastReadTime`) of the given spaces, 5 at a time. Failures leave a space out. */
async function readPositions(spaceNames: string[]): Promise<Map<string, string | undefined>> {
  const positions = new Map<string, string | undefined>();
  await mapLimit(spaceNames, CONCURRENCY, async (name) => {
    try {
      positions.set(name, (await getSpaceReadState(name)).lastReadTime);
    } catch (error) {
      console.error(`Read position failed for ${name}`, error);
    }
  });
  return positions;
}

/** Fallback: messages after `lastReadTime` in recently active spaces. Spaces without a read time are skipped. */
async function readStateUnread(
  spaces: Space[],
  lookbackDays: number,
): Promise<{ messages: Message[]; capped: boolean }> {
  const recent = recentlyActiveSpaces(spaces, lookbackDays);
  const states = await mapLimit(recent, CONCURRENCY, (space) => getSpaceReadState(space.name));
  const candidates = recent
    .map((space, i) => ({ space, readState: states[i] }))
    .filter(({ space, readState }) => isSpaceUnread(space, readState));
  const pages = await mapLimit(candidates, CONCURRENCY, ({ space, readState }) =>
    listMessages(space.name, { pageSize: UNREAD_PAGE_SIZE, filter: unreadMessagesFilter(readState) }),
  );
  return {
    // Search results carry only `space.name`; list results may not, so set it for grouping.
    messages: pages.flatMap((page, i) =>
      (page.messages ?? []).map((m) => ({ ...m, space: m.space?.name ? m.space : { name: candidates[i].space.name } })),
    ),
    capped: pages.some((page) => !!page.nextPageToken),
  };
}

/**
 * Unread messages grouped by space (newest unread first), with totals. Only messages created in the
 * last `lookbackDays` days count. Your own messages are excluded.
 */
export async function loadUnread(lookbackDays: number): Promise<Unread> {
  const [spaces, me] = await Promise.all([listSpacesSorted(), getMe()]);
  let source: Unread["source"] = "search";
  let found: { messages: Message[]; capped: boolean };
  try {
    found = await searchUnread(lookbackDays);
  } catch (error) {
    if (!shouldFallBackFromSearch(error)) throw error;
    console.error("Unread search failed; falling back to read state", error);
    source = "readState";
    found = await readStateUnread(spaces, lookbackDays);
  }

  // Keep only what Chat's Home counts as unread (see `countsAsUnread`).
  const others = excludeOwnMessages(found.messages, me.userName);
  const positions = source === "search" ? await readPositions([...new Set(others.map(messageSpaceName))]) : new Map();
  const visible = others.filter((message) =>
    countsAsUnread(message, positions.get(messageSpaceName(message)), me.userName),
  );
  const groups = groupUnreadBySpace(visible, me.userName);
  const byName = new Map(spaces.map((space) => [space.name, space]));
  const groupSpaces = await mapLimit(
    groups,
    CONCURRENCY,
    async (group): Promise<Space> =>
      byName.get(group.spaceName) ?? (await getSpace(group.spaceName).catch(() => ({ name: group.spaceName }))),
  );
  const items = await resolveSpaceItems(groupSpaces);
  const unread = groups.map((group, i) => ({ ...group, item: items[i] }));
  return { spaces: unread, total: countUnread(unread), capped: found.capped, source };
}

function readShared(): SharedUnreadEntry<Unread> | undefined {
  try {
    const raw = cache.get(RESULT_KEY);
    const entry = raw ? (JSON.parse(raw) as SharedUnreadEntry<Unread>) : undefined;
    return entry && Array.isArray(entry.result?.spaces) ? entry : undefined;
  } catch {
    return undefined;
  }
}

function writeShared(entry: SharedUnreadEntry<Unread>) {
  cache.set(RESULT_KEY, JSON.stringify(entry));
}

/** Refreshes Unread Chat's root search subtitle from the shared result (skipping the current command). */
async function refreshUnreadSurfaces(): Promise<void> {
  await Promise.all(
    UNREAD_SURFACES.filter((name) => name !== environment.commandName).map(async (name) => {
      try {
        await launchCommand({ name, type: LaunchType.Background });
      } catch {
        // "No enabled command": Unread Chat is disabled or hasn't been run yet; nothing to refresh.
      }
    }),
  );
}

/** Waits for a search another command started recently, and returns its result if it lands in time. */
async function awaitPendingSearch(lookbackDays: number): Promise<Unread | undefined> {
  const started = Number(cache.get(PENDING_KEY));
  if (!started || Date.now() - started > PENDING_TTL_MS) return undefined;
  const deadline = Date.now() + PENDING_WAIT_MS;
  while (Date.now() < deadline) {
    await defaultSleep(500);
    const entry = readShared();
    if (entry && entry.at >= started && entry.lookbackDays === lookbackDays) return entry.result;
    if (!cache.has(PENDING_KEY)) return undefined;
  }
  return undefined;
}

/**
 * The shared unread result: reused when at most `maxAgeMs` old (0 always searches), else searched
 * once, stored for the other commands, and Unread Chat's subtitle refreshed.
 */
export async function getUnread(lookbackDays: number, options: { maxAgeMs: number }): Promise<Unread> {
  const fresh = freshSharedUnread(readShared(), lookbackDays, options.maxAgeMs);
  if (fresh) return fresh;
  const pending = await awaitPendingSearch(lookbackDays);
  if (pending) return pending;

  cache.set(PENDING_KEY, String(Date.now()));
  let result: Unread;
  try {
    result = await loadUnread(lookbackDays);
  } finally {
    cache.remove(PENDING_KEY);
  }
  writeShared({ at: Date.now(), lookbackDays, result });
  await refreshUnreadSurfaces();
  return result;
}

/** Marks spaces read (`updateSpaceReadState`), removes them from the shared result, and refreshes Unread Chat's subtitle. */
export async function markRead(spaceNames: string | string[]): Promise<void> {
  const names = Array.isArray(spaceNames) ? spaceNames : [spaceNames];
  try {
    await Promise.all(names.map((name) => markSpaceAsRead(name)));
  } finally {
    const entry = readShared();
    if (entry) writeShared({ ...entry, result: withoutSpaces(entry.result, names) });
    await refreshUnreadSurfaces();
  }
}
