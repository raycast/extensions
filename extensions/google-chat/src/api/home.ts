/**
 * Data for My Messages (Chat's Home view): the newest message from someone else in each conversation,
 * whether the user replied last, the names previews need, and recent messages that mention the user.
 */

import { mapLimit, REQUEST_CONCURRENCY as CONCURRENCY } from "../helpers/backoff";
import type { UserNames } from "../helpers/chat-format";
import { isAuthError, isScopeError } from "../helpers/errors";
import { collectMentionsWithUnread, mentionRows, type MentionRow } from "../helpers/my-mentions";
import {
  choosePreview,
  type LatestDetails,
  LATEST_PAGE_SIZE,
  namesFor,
  needsLatestCheck,
  newestFirst,
  planReadPage,
  previewUsers,
  youReplied,
} from "../helpers/my-messages";
import { messageSpaceName } from "../helpers/unread";
import { getSpace, listMessages, searchMessages } from "./chat";
import { getCachedPeople, getMe, lookUpPeople } from "./people";
import { listSpacesSorted, resolveSpaceItems } from "./spaces";
import type { Message, Space, SpaceItem } from "./types";
import type { UnreadSpace } from "./unread";

/** A conversation in the Read section. */
export interface HomeRow extends LatestDetails {
  item: SpaceItem;
  /**
   * Built from the unread result (the conversation was unread when its page loaded), so its preview and
   * "You replied" cover only the unread messages until {@link loadLatestDetails} fills them in.
   */
  fromUnread?: boolean;
}

type LatestMessages = Omit<LatestDetails, "names">;

/** Errors that mean every request will fail, so the page should fail rather than show rows without previews. */
function isFatal(error: unknown): boolean {
  return isAuthError(error) || isScopeError(error);
}

/**
 * The newest messages in a space: one `spaces.messages.list` of 15, newest first. One request instead of
 * paging, since rows wait on the slowest conversation.
 */
async function loadLatestMessages(spaceName: string, me: string): Promise<LatestMessages> {
  const response = await listMessages(spaceName, { pageSize: LATEST_PAGE_SIZE, orderBy: "create_time desc" });
  const seen = response.messages ?? [];
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

/**
 * Cursor of the Read pagination: every conversation, most recently active first, from the first page's
 * `spaces.list`, and where the next page starts.
 */
export interface ReadCursor {
  spaces: Space[];
  offset: number;
}

/** A Read row for a conversation that was unread when its page loaded, from the unread result. */
function rowFromUnread(entry: UnreadSpace, names: UserNames): HomeRow {
  const preview = entry.messages[0];
  return {
    item: entry.item,
    preview,
    youReplied: false,
    latestTime: entry.latestTime ?? entry.item.space.lastActiveTime,
    names: namesFor(preview, names),
    fromUnread: true,
  };
}

/**
 * The newest messages of conversations that moved from Unread to Read since their page loaded (marked as
 * read, or read elsewhere), so their rows match what a Read page shows. Conversations whose messages fail
 * to load are left out.
 */
export async function loadLatestDetails(spaceNames: string[]): Promise<Record<string, LatestDetails>> {
  if (spaceNames.length === 0) return {};
  const me = await getMe();
  const latest = await mapLimit(spaceNames, CONCURRENCY, async (name): Promise<LatestMessages | undefined> => {
    try {
      return await loadLatestMessages(name, me.userName);
    } catch (error) {
      if (isFatal(error)) throw error;
      console.error(`Latest messages failed for ${name}`, error);
      return undefined;
    }
  });
  const names = await loadPreviewNames(latest.flatMap((entry) => (entry?.preview ? [entry.preview] : [])));
  return Object.fromEntries(
    spaceNames.flatMap((name, i) => {
      const entry = latest[i];
      return entry ? [[name, { ...entry, names: namesFor(entry.preview, names) }]] : [];
    }),
  );
}

/**
 * One page of conversations for the Read section, most recently active first (25 that aren't unread per
 * page). The first page lists every space once (`spaces.list`); each page then resolves titles and lists
 * the newest messages of its conversations, 10 at a time. Conversations unread when the page loads keep a
 * row built from the unread result, without requests; My Messages hides them while the latest unread result
 * lists them, so one read elsewhere or marked as read shows under Read straight away.
 */
export async function loadReadPage(
  page: number,
  cursor: ReadCursor | undefined,
  unread: UnreadSpace[] = [],
): Promise<{ data: HomeRow[]; hasMore: boolean; cursor: ReadCursor }> {
  const first = page === 0 || !cursor;
  const spaces = first ? await listSpacesSorted() : cursor.spaces;
  const unreadByName = new Map(unread.map((entry) => [entry.spaceName, entry]));
  const slice = planReadPage(spaces, first ? 0 : cursor.offset, new Set(unreadByName.keys()));
  const toLoad = slice.items.filter((space) => !unreadByName.has(space.name));
  const [me, items] = await Promise.all([getMe(), resolveSpaceItems(toLoad)]);
  const latest = await mapLimit(items, CONCURRENCY, async (item): Promise<LatestMessages> => {
    try {
      return await loadLatestMessages(item.space.name, me.userName);
    } catch (error) {
      if (isFatal(error)) throw error;
      console.error(`Latest messages failed for ${item.space.name}`, error);
      return { youReplied: false };
    }
  });
  const fromUnread = slice.items.flatMap((space) => unreadByName.get(space.name) ?? []);
  const previews = [...latest.map((entry) => entry.preview), ...fromUnread.map((entry) => entry.messages[0])];
  const names = await loadPreviewNames(previews.filter((message): message is Message => !!message));
  const loaded = new Map(
    items.map((item, i): [string, HomeRow] => [
      item.space.name,
      {
        item,
        preview: latest[i].preview,
        youReplied: latest[i].youReplied,
        latestTime: latest[i].latestTime ?? item.space.lastActiveTime,
        names: namesFor(latest[i].preview, names),
      },
    ]),
  );
  return {
    data: slice.items.flatMap((space) => {
      const entry = unreadByName.get(space.name);
      if (entry) return [rowFromUnread(entry, names)];
      const row = loaded.get(space.name);
      return row ? [row] : [];
    }),
    hasMore: slice.hasMore,
    cursor: { spaces, offset: slice.nextOffset },
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

/** The Mentions section: messages that mention the user, newest first, each with whether it is unread. */
export interface MentionsResult {
  rows: MentionRow[];
  /** More mentions may exist than the rows hold. */
  capped: boolean;
}

/**
 * Messages from the last `days` days that mention the user (`messages:search` with
 * `annotations.user_mentions.user.name:users/me`), newest first, at most `limit`, without the user's own.
 * A second search, the same with `is_unread()`, runs alongside and tells which are unread (unknown if it
 * fails). Conversation titles are resolved like the Unread section's, and preview names like every row's.
 */
export async function loadMentions(days: number, limit: number): Promise<MentionsResult> {
  const me = await getMe();
  const [spaces, found] = await Promise.all([
    listSpacesSorted(),
    collectMentionsWithUnread({
      days,
      limit,
      me: me.userName,
      fetchPage: async ({ filter, pageSize, pageToken }) => {
        const page = await searchMessages({ filter, pageSize, pageToken, orderBy: "create_time desc" });
        return {
          messages: (page.results ?? []).flatMap((result) => (result.message ? [result.message] : [])),
          nextPageToken: page.nextPageToken,
        };
      },
      onPageError: (error) => console.error("Mentions search page failed; keeping earlier pages", error),
      onUnreadError: (error) => console.error("Unread mentions search failed; unread state unknown", error),
    }),
  ]);
  if (found.messages.length === 0) return { rows: [], capped: found.capped };
  const byName = new Map(spaces.map((space) => [space.name, space]));
  const spaceNames = [...new Set(found.messages.map(messageSpaceName))];
  const mentionSpaces = await mapLimit(
    spaceNames,
    CONCURRENCY,
    async (name): Promise<Space> => byName.get(name) ?? (await getSpace(name).catch(() => ({ name }))),
  );
  const items = await resolveSpaceItems(mentionSpaces);
  const names = await loadPreviewNames(found.messages);
  const itemsByName = new Map(items.map((item) => [item.space.name, item]));
  return { rows: mentionRows(found.messages, itemsByName, names, found.unread), capped: found.capped };
}
