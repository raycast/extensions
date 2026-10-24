/**
 * Unread messages, from Chat's own per-message read state: `spaces.messages.search` with `is_unread()`
 * (100 per page, up to 500, or up to 1,000 while none of them count as unread). If search is rejected, falls
 * back to comparing each recently active space's `spaceReadState.lastReadTime` with its messages.
 *
 * One result is shared through the Raycast cache by Unread Chat (which runs every 5 minutes), My Messages
 * and the AI tool, so background runs within 2 minutes of another search reuse its result.
 */

import { Cache, environment, launchCommand, LaunchType } from "@raycast/api";

import { defaultSleep, mapLimit, REQUEST_CONCURRENCY as CONCURRENCY } from "../helpers/backoff";
import {
  collectUnread,
  countUnread,
  freshSharedUnread,
  groupUnreadBySpace,
  isSpaceUnread,
  recentlyActiveSpaces,
  settleMarkRead,
  shouldFallBackFromSearch,
  UNREAD_PAGE_SIZE,
  unreadMessagesFilter,
  unreadSearchFilter,
  withoutSpaces,
  type SharedUnreadEntry,
  type UnreadGroup,
  type UnreadResult,
  countsAsUnread,
  excludeOwnMessages,
} from "../helpers/unread";
import { getSpace, getSpaceReadState, listMessages, markSpaceAsRead, searchMessages } from "./chat";
import { getMe } from "./people";
import { listSpacesSorted, resolveSpaceItems } from "./spaces";
import type { Message, Space, SpaceItem } from "./types";

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

/**
 * Unread messages from `messages:search` that Chat's Home counts, newest first, paging until there are no
 * more or the cap is hit (see `collectUnread`). The filter is built once, as every page must send the same one.
 */
async function searchUnread(lookbackDays: number, me: string): Promise<{ messages: Message[]; capped: boolean }> {
  const filter = unreadSearchFilter(lookbackDays);
  return collectUnread({
    fetchPage: async (pageToken) => {
      const page = await searchMessages({ filter, pageSize: UNREAD_PAGE_SIZE, pageToken, orderBy: "create_time desc" });
      return {
        messages: (page.results ?? []).flatMap((result) => (result.message ? [result.message] : [])),
        nextPageToken: page.nextPageToken,
      };
    },
    readPositions,
    me,
    onPageError: (error) => console.error("Unread search page failed; keeping earlier pages", error),
  });
}

/** Read positions (`spaceReadState.lastReadTime`) of the given spaces, 10 at a time. Failures leave a space out. */
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

/**
 * Fallback: messages after `lastReadTime` (or the lookback start, when later) in recently active spaces.
 * Spaces without a read time are skipped.
 */
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
    listMessages(space.name, { pageSize: UNREAD_PAGE_SIZE, filter: unreadMessagesFilter(readState, lookbackDays) }),
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
  // The search doesn't need the space list (only titles and the fallback do), so it doesn't wait for it.
  const spacesRequest = listSpacesSorted();
  // Awaited below; this only keeps an early search failure from leaving its rejection unhandled.
  spacesRequest.catch(() => undefined);
  const me = await getMe();
  let source: Unread["source"] = "search";
  // Only what Chat's Home counts as unread (see `countsAsUnread`).
  let found: { messages: Message[]; capped: boolean };
  try {
    found = await searchUnread(lookbackDays, me.userName);
  } catch (error) {
    if (!shouldFallBackFromSearch(error)) throw error;
    console.error("Unread search failed; falling back to read state", error);
    source = "readState";
    const fallback = await readStateUnread(await spacesRequest, lookbackDays);
    // Already after each space's read position, so no positions are needed.
    const visible = excludeOwnMessages(fallback.messages, me.userName).filter((message) =>
      countsAsUnread(message, undefined, me.userName),
    );
    found = { messages: visible, capped: fallback.capped };
  }

  const spaces = await spacesRequest;
  const groups = groupUnreadBySpace(found.messages, me.userName);
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
  // Not awaited: the result is ready, and Unread Chat's subtitle can follow on its own (it never throws).
  void refreshUnreadSurfaces();
  return result;
}

/**
 * Marks spaces read (`updateSpaceReadState`), removes the ones that succeeded from the shared result, and
 * refreshes Unread Chat's subtitle. Throws when any failed: the error itself when none succeeded, else a
 * `MarkReadError` listing the spaces that were marked.
 */
export async function markRead(spaceNames: string | string[]): Promise<void> {
  const names = Array.isArray(spaceNames) ? spaceNames : [spaceNames];
  const results = await Promise.allSettled(names.map((name) => markSpaceAsRead(name)));
  const { marked, error } = settleMarkRead(names, results);
  if (marked.length > 0) {
    const entry = readShared();
    if (entry) writeShared({ ...entry, result: withoutSpaces(entry.result, marked) });
    await refreshUnreadSurfaces();
  }
  if (error) throw error;
}
