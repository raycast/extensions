/**
 * Data for My Messages (Chat's Home view): the newest message from someone else in each conversation,
 * whether the user replied last, and the names previews need.
 */

import { mapLimit } from "../helpers/backoff";
import type { UserNames } from "../helpers/chat-format";
import { isAuthError, isScopeError } from "../helpers/errors";
import {
  choosePreview,
  LATEST_MAX_PAGES,
  LATEST_PAGE_SIZE,
  namesFor,
  needsLatestCheck,
  newestFirst,
  previewUsers,
  readPage,
  youReplied,
} from "../helpers/my-messages";
import { listMessages } from "./chat";
import { getCachedPeople, getMe, lookUpPeople } from "./people";
import { listSpacesSorted, resolveSpaceItems } from "./spaces";
import type { Message, Space, SpaceItem } from "./types";
import type { UnreadSpace } from "./unread";

const CONCURRENCY = 5;

/** A conversation in the Read section. */
export interface HomeRow {
  item: SpaceItem;
  /** Newest message not sent by the user, if one was found. */
  preview?: Message;
  /** The newest message in the conversation is the user's own. */
  youReplied: boolean;
  /** Create time of the newest message (anyone's). */
  latestTime?: string;
  /** Names of the preview's sender and the people it mentions. */
  names: UserNames;
}

interface LatestMessages {
  preview?: Message;
  youReplied: boolean;
  latestTime?: string;
}

/** Errors that mean every request will fail, so the page should fail rather than show rows without previews. */
function isFatal(error: unknown): boolean {
  return isAuthError(error) || isScopeError(error);
}

/**
 * The newest messages in a space (`spaces.messages.list`, newest first, 5 per page), paging only until one
 * from someone else turns up, at most 3 pages.
 */
async function loadLatestMessages(spaceName: string, me: string): Promise<LatestMessages> {
  const seen: Message[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < LATEST_MAX_PAGES; page++) {
    const response = await listMessages(spaceName, {
      pageSize: LATEST_PAGE_SIZE,
      pageToken,
      orderBy: "create_time desc",
    });
    seen.push(...(response.messages ?? []));
    pageToken = response.nextPageToken || undefined;
    if (choosePreview(seen, me) || !pageToken) break;
  }
  return {
    preview: choosePreview(seen, me),
    youReplied: youReplied(seen, me),
    latestTime: newestFirst(seen)[0]?.createTime,
  };
}

/**
 * Display names for previews: senders and mentioned people from the People cache (looked up when
 * missing), plus the signed-in user so mentions of them read `@Their Name`.
 */
export async function loadPreviewNames(messages: Message[]): Promise<UserNames> {
  const users = [...new Set(messages.flatMap(previewUsers))];
  let people = getCachedPeople();
  const missing = users.filter((user) => !people[user]?.name);
  if (missing.length > 0) people = await lookUpPeople(missing);
  const me = await getMe();
  const names: UserNames = {};
  for (const user of users) {
    const name = people[user]?.name;
    if (name) names[user] = name;
  }
  if (me.name) names[me.userName] = me.name;
  return names;
}

/** Cursor of the Read pagination: every conversation, most recently active first, from the first page's `spaces.list`. */
export interface ReadCursor {
  spaces: Space[];
}

/**
 * One page of conversations for the Read section, most recently active first (25 per page). The first
 * page lists every space once (`spaces.list`); each page then resolves titles and lists the newest
 * messages of its conversations, 5 at a time. Conversations that were unread when the first page loaded are
 * left out; one marked as read joins Read on the next refresh.
 */
export async function loadReadPage(
  page: number,
  cursor: ReadCursor | undefined,
  unreadSpaceNames: ReadonlySet<string> = new Set(),
): Promise<{ data: HomeRow[]; hasMore: boolean; cursor: ReadCursor }> {
  // Unread conversations are left out before paging, so every page holds 25 Read rows and no preview
  // requests are spent on conversations the Unread section already shows.
  const spaces =
    page === 0 || !cursor
      ? (await listSpacesSorted()).filter((space) => !unreadSpaceNames.has(space.name))
      : cursor.spaces;
  const slice = readPage(spaces, page);
  const [me, items] = await Promise.all([getMe(), resolveSpaceItems(slice.items)]);
  const latest = await mapLimit(items, CONCURRENCY, async (item): Promise<LatestMessages> => {
    try {
      return await loadLatestMessages(item.space.name, me.userName);
    } catch (error) {
      if (isFatal(error)) throw error;
      console.error(`Latest messages failed for ${item.space.name}`, error);
      return { youReplied: false };
    }
  });
  const names = await loadPreviewNames(latest.flatMap((entry) => (entry.preview ? [entry.preview] : [])));
  return {
    data: items.map((item, i) => ({
      item,
      preview: latest[i].preview,
      youReplied: latest[i].youReplied,
      latestTime: latest[i].latestTime ?? item.space.lastActiveTime,
      names: namesFor(latest[i].preview, names),
    })),
    hasMore: slice.hasMore,
    cursor: { spaces },
  };
}

/** Extra details for Unread rows: preview names, and the unread conversations where the user replied last. */
export interface UnreadExtras {
  names: UserNames;
  /** Space names whose newest message is the user's own. */
  replied: string[];
}

/** What {@link loadUnreadExtras} needs per unread conversation (small, as it's the hook's cache key). */
export interface UnreadPreviewInput {
  spaceName: string;
  /** The space's `lastActiveTime`. */
  lastActiveTime?: string;
  /** Create time of the newest unread message. */
  latestTime?: string;
  /** The newest unread message (the preview). */
  newest?: Message;
}

/** The inputs for {@link loadUnreadExtras} from unread conversations. */
export function unreadPreviewInputs(entries: UnreadSpace[]): UnreadPreviewInput[] {
  return entries.map((entry) => ({
    spaceName: entry.spaceName,
    lastActiveTime: entry.item.space.lastActiveTime,
    latestTime: entry.latestTime,
    newest: entry.messages[0],
  }));
}

/**
 * Names for the newest unread message of each conversation, and "You replied" for conversations whose
 * last activity is newer than their newest unread message (one `spaces.messages.list` of 1 message each).
 */
export async function loadUnreadExtras(entries: UnreadPreviewInput[]): Promise<UnreadExtras> {
  if (entries.length === 0) return { names: {}, replied: [] };
  const me = await getMe();
  const toCheck = entries.filter((entry) => needsLatestCheck(entry.lastActiveTime, entry.latestTime));
  const checks = await mapLimit(toCheck, CONCURRENCY, async (entry) => {
    try {
      const response = await listMessages(entry.spaceName, { pageSize: 1, orderBy: "create_time desc" });
      return youReplied(response.messages ?? [], me.userName);
    } catch (error) {
      if (isFatal(error)) throw error;
      console.error(`Latest message failed for ${entry.spaceName}`, error);
      return false;
    }
  });
  const names = await loadPreviewNames(entries.flatMap((entry) => (entry.newest ? [entry.newest] : [])));
  return { names, replied: toCheck.filter((_, i) => checks[i]).map((entry) => entry.spaceName) };
}
