import { afterEach, describe, expect, it, vi } from "vitest";

import type { Message, SpaceItem } from "../src/api/types";
import {
  collectMentions,
  collectMentionsWithUnread,
  DEFAULT_MENTIONS_DAYS,
  DEFAULT_MENTIONS_LIMIT,
  mentionRows,
  mentionsSearchFilters,
  mentionsSubtitle,
  mentionUnread,
  parseMentionsDays,
  parseMentionsLimit,
  selectMentions,
  unreadMessageNames,
  visibleMentions,
  withMentionsRead,
  type MentionsPageRequest,
} from "../src/helpers/my-mentions";

const ME = "users/111";
const NOW = new Date("2026-10-15T12:00:00Z");

const message = (name: string, createTime: string, sender = "users/222", extra: Partial<Message> = {}): Message => ({
  name,
  createTime,
  sender: { name: sender },
  ...extra,
});

/** `count` mentions in `space`, a minute apart, newest first, starting from `start` minutes before NOW. */
function mentions(space: string, count: number, start = 0, sender = "users/222"): Message[] {
  return Array.from({ length: count }, (_, i) =>
    message(
      `${space}/messages/m${start + i}`,
      new Date(NOW.getTime() - (start + i + 1) * 60_000).toISOString(),
      sender,
    ),
  );
}

describe("parseMentionsDays and parseMentionsLimit", () => {
  it("accept the dropdown values and fall back to the defaults", () => {
    expect(parseMentionsDays("1")).toBe(1);
    expect(parseMentionsDays("14")).toBe(14);
    expect(parseMentionsDays("5")).toBe(DEFAULT_MENTIONS_DAYS);
    expect(parseMentionsDays(undefined)).toBe(7);
    expect(parseMentionsLimit("50")).toBe(50);
    expect(parseMentionsLimit("abc")).toBe(DEFAULT_MENTIONS_LIMIT);
    expect(parseMentionsLimit(undefined)).toBe(20);
  });
});

describe("mentionsSearchFilters", () => {
  it("asks for mentions of the caller from the last N days, and the unread ones with the same cutoff", () => {
    expect(mentionsSearchFilters(7, NOW)).toEqual({
      mentions: 'annotations.user_mentions.user.name:users/me AND create_time >= "2026-10-08T12:00:00.000Z"',
      unreadMentions:
        'annotations.user_mentions.user.name:users/me AND is_unread() AND create_time >= "2026-10-08T12:00:00.000Z"',
    });
    expect(mentionsSearchFilters(1, NOW).mentions).toBe(
      'annotations.user_mentions.user.name:users/me AND create_time >= "2026-10-14T12:00:00.000Z"',
    );
  });
});

describe("selectMentions", () => {
  it("excludes your own messages and duplicates, newest first", () => {
    const messages = [
      message("spaces/A/messages/old", "2026-10-15T08:00:00Z"),
      message("spaces/A/messages/mine", "2026-10-15T11:00:00Z", ME),
      message("spaces/A/messages/me-alias", "2026-10-15T11:30:00Z", "users/me"),
      message("spaces/B/messages/new", "2026-10-15T10:00:00Z"),
      message("spaces/A/messages/old", "2026-10-15T08:00:00Z"),
    ];
    const selected = selectMentions(messages, ME, 10);
    expect(selected.messages.map((m) => m.name)).toEqual(["spaces/B/messages/new", "spaces/A/messages/old"]);
    expect(selected.capped).toBe(false);
  });

  it("caps at the limit and says more exist", () => {
    const selected = selectMentions(mentions("spaces/A", 5), ME, 3);
    expect(selected.messages.map((m) => m.name)).toEqual([
      "spaces/A/messages/m0",
      "spaces/A/messages/m1",
      "spaces/A/messages/m2",
    ]);
    expect(selected.capped).toBe(true);
  });
});

/** Serves `all` in pages of the requested size, recording each request. */
function pager(all: Message[], options: { failOnPage?: number } = {}) {
  const requests: MentionsPageRequest[] = [];
  const fetchPage = async (request: MentionsPageRequest) => {
    requests.push(request);
    const start = Number(request.pageToken ?? 0);
    if (options.failOnPage !== undefined && requests.length - 1 === options.failOnPage) {
      throw new Error("Internal error encountered");
    }
    const end = start + request.pageSize;
    return { messages: all.slice(start, end), nextPageToken: end < all.length ? String(end) : undefined };
  };
  return { requests, fetchPage };
}

const FILTERS = mentionsSearchFilters(7, NOW);

describe("collectMentions", () => {
  it("sends the same filter on every page and pages past your own messages", async () => {
    const all = [...mentions("spaces/A", 3, 0, ME), ...mentions("spaces/A", 4, 3)];
    const { requests, fetchPage } = pager(all);
    const found = await collectMentions({ fetchPage, filter: FILTERS.mentions, limit: 3, me: ME });
    expect(requests).toHaveLength(2);
    expect(requests.map((r) => r.filter)).toEqual([FILTERS.mentions, FILTERS.mentions]);
    expect(requests.map((r) => [r.pageSize, r.pageToken])).toEqual([
      [3, undefined],
      [3, "3"],
    ]);
    expect(found.messages.map((m) => m.name)).toEqual([
      "spaces/A/messages/m3",
      "spaces/A/messages/m4",
      "spaces/A/messages/m5",
    ]);
    // One more result is left unchecked.
    expect(found.capped).toBe(true);
  });

  it("stops at the first page when it fills the limit, and isn't capped when nothing is left", async () => {
    const full = pager(mentions("spaces/A", 25));
    const capped = await collectMentions({ fetchPage: full.fetchPage, filter: FILTERS.mentions, limit: 20, me: ME });
    expect(full.requests).toHaveLength(1);
    expect(capped.messages).toHaveLength(20);
    expect(capped.capped).toBe(true);

    const few = pager(mentions("spaces/A", 4));
    const all = await collectMentions({ fetchPage: few.fetchPage, filter: FILTERS.mentions, limit: 20, me: ME });
    expect(all.messages).toHaveLength(4);
    expect(all.capped).toBe(false);
  });

  it("stops after the page limit", async () => {
    const { requests, fetchPage } = pager(mentions("spaces/A", 10, 0, ME));
    const found = await collectMentions({ fetchPage, filter: FILTERS.mentions, limit: 2, me: ME, maxPages: 3 });
    expect(requests).toHaveLength(3);
    expect(found).toEqual({ messages: [], capped: true });
  });

  it("throws on a first-page failure and keeps earlier pages on a later one", async () => {
    const first = pager(mentions("spaces/A", 5), { failOnPage: 0 });
    await expect(
      collectMentions({ fetchPage: first.fetchPage, filter: FILTERS.mentions, limit: 2, me: ME }),
    ).rejects.toThrow();

    const errors: unknown[] = [];
    const later = pager([...mentions("spaces/A", 2, 0, ME), ...mentions("spaces/A", 3, 2)], { failOnPage: 1 });
    const found = await collectMentions({
      fetchPage: later.fetchPage,
      filter: FILTERS.mentions,
      limit: 2,
      me: ME,
      onPageError: (error) => errors.push(error),
    });
    expect(found).toEqual({ messages: [], capped: true });
    expect(errors).toHaveLength(1);
  });
});

describe("collectMentionsWithUnread", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  /** Answers both searches: unread-mentions requests from `unread`, the rest from `all`. */
  function twoSearches(all: Message[], unread: Message[], options: { unreadFailOnPage?: number } = {}) {
    const mentionsPager = pager(all);
    const unreadPager = pager(unread, { failOnPage: options.unreadFailOnPage });
    const fetchPage = (request: MentionsPageRequest) =>
      (request.filter.includes("is_unread()") ? unreadPager : mentionsPager).fetchPage(request);
    return { fetchPage, mentionsRequests: mentionsPager.requests, unreadRequests: unreadPager.requests };
  }

  it("builds both filters once, with the same cutoff, so later pages don't pick up a newer time", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    // Your own messages fill the first two pages of each search; each page takes a minute.
    const own = mentions("spaces/A", 4, 0, ME);
    const searches = twoSearches([...own, ...mentions("spaces/A", 2, 4)], [...own, ...mentions("spaces/A", 2, 4)]);
    const slow = async (request: MentionsPageRequest) => {
      vi.setSystemTime(Date.now() + 60_000);
      return searches.fetchPage(request);
    };
    await collectMentionsWithUnread({ fetchPage: slow, days: 7, limit: 2, me: ME });
    expect(searches.mentionsRequests).toHaveLength(3);
    expect(searches.unreadRequests).toHaveLength(3);
    expect(new Set(searches.mentionsRequests.map((r) => r.filter))).toEqual(new Set([FILTERS.mentions]));
    expect(new Set(searches.unreadRequests.map((r) => r.filter))).toEqual(new Set([FILTERS.unreadMentions]));
    expect(searches.unreadRequests.map((r) => r.pageSize)).toEqual([2, 2, 2]);
  });

  it("lists the unread mentions from the second search", async () => {
    const all = mentions("spaces/A", 5);
    const searches = twoSearches(all, [all[1], all[4]]);
    const found = await collectMentionsWithUnread({
      fetchPage: searches.fetchPage,
      days: 7,
      limit: 3,
      me: ME,
      now: NOW,
    });
    expect(found.messages.map((m) => m.name)).toEqual(all.slice(0, 3).map((m) => m.name));
    expect(found.capped).toBe(true);
    expect(found.unread).toEqual({ names: [all[1].name, all[4].name], complete: true });
  });

  it("leaves unread unknown when the unread-mentions search fails, and keeps the mentions", async () => {
    const all = mentions("spaces/A", 3);
    const errors: unknown[] = [];
    const failed = twoSearches(all, all, { unreadFailOnPage: 0 });
    const found = await collectMentionsWithUnread({
      fetchPage: failed.fetchPage,
      days: 7,
      limit: 5,
      me: ME,
      now: NOW,
      onUnreadError: (error) => errors.push(error),
    });
    expect(found.messages).toHaveLength(3);
    expect(found.unread).toBeUndefined();
    expect(errors).toHaveLength(1);

    // A later page failing keeps what loaded, but a mention it doesn't list is no longer known to be read.
    const own = mentions("spaces/A", 2, 0, ME);
    const partial = twoSearches(all, [...own, all[0]], { unreadFailOnPage: 1 });
    const later = await collectMentionsWithUnread({
      fetchPage: partial.fetchPage,
      days: 7,
      limit: 2,
      me: ME,
      now: NOW,
    });
    expect(later.unread).toEqual({ names: [], complete: false });
  });

  it("throws when the mentions search fails", async () => {
    const searches = twoSearches([], []);
    const fetchPage = async (request: MentionsPageRequest) => {
      if (!request.filter.includes("is_unread()")) throw new Error("Internal error encountered");
      return searches.fetchPage(request);
    };
    await expect(collectMentionsWithUnread({ fetchPage, days: 7, limit: 2, me: ME })).rejects.toThrow();
  });
});

describe("mentionUnread", () => {
  it("is true when listed, false when the search was complete, and unknown otherwise", () => {
    expect(mentionUnread("m1", { names: ["m1"], complete: false })).toBe(true);
    expect(mentionUnread("m2", { names: ["m1"], complete: true })).toBe(false);
    expect(mentionUnread("m2", { names: ["m1"], complete: false })).toBeUndefined();
    expect(mentionUnread("m1", undefined)).toBeUndefined();
  });
});

describe("mentionRows", () => {
  const item = (name: string, title: string): SpaceItem => ({ space: { name }, title, kind: "space" });

  it("sorts newest first and attaches each conversation and the names its preview needs", () => {
    const older = message("spaces/A/messages/1", "2026-10-15T08:00:00Z", "users/222", {
      annotations: [{ type: "USER_MENTION", userMention: { user: { name: ME }, type: "MENTION" } }],
    });
    const newer = message("spaces/B/messages/2", "2026-10-15T09:00:00Z", "users/333", { space: { name: "spaces/B" } });
    const items = new Map([
      ["spaces/A", item("spaces/A", "Design")],
      ["spaces/B", item("spaces/B", "Ops")],
    ]);
    const names = { "users/222": "Priya", "users/333": "Sam", [ME]: "Alex", "users/999": "Unused" };
    const rows = mentionRows([older, newer], items, names);
    expect(rows.map((r) => [r.message.name, r.item.title])).toEqual([
      ["spaces/B/messages/2", "Ops"],
      ["spaces/A/messages/1", "Design"],
    ]);
    expect(rows[0].names).toEqual({ "users/333": "Sam" });
    expect(rows[1].names).toEqual({ "users/222": "Priya", [ME]: "Alex" });
  });

  it("marks each row unread from the unread-mentions search", () => {
    const messages = [
      message("spaces/A/messages/1", "2026-10-15T09:00:00Z"),
      message("spaces/A/messages/2", "2026-10-15T08:00:00Z"),
    ];
    const unread = { names: ["spaces/A/messages/2"], complete: true };
    expect(mentionRows(messages, new Map(), {}, unread).map((r) => r.unread)).toEqual([false, true]);
    expect(mentionRows(messages, new Map(), {}).map((r) => r.unread)).toEqual([undefined, undefined]);
  });

  it("gives a conversation it can't resolve a placeholder title", () => {
    const rows = mentionRows([message("spaces/Z/messages/1", "2026-10-15T08:00:00Z")], new Map(), {});
    expect(rows[0].item).toEqual({ space: { name: "spaces/Z" }, title: "Conversation", kind: "space" });
  });
});

describe("visibleMentions", () => {
  const row = (name: string, unread?: boolean) => ({ message: { name }, unread });

  it("after a failed refresh, ignores saved flags and follows a complete shared result", () => {
    const rows = [row("m/read-since", true), row("m/still-unread", true)];
    const shared = { names: new Set(["m/still-unread"]), capped: false };
    const shown = visibleMentions(rows, shared, false, true);
    expect(shown.map((r) => r.unread)).toEqual([false, true]);
    expect(visibleMentions(rows, shared, true, true).map((r) => r.message.name)).toEqual(["m/still-unread"]);
  });

  it("after a failed refresh with a capped shared result, leaves unlisted mentions unknown and visible", () => {
    const rows = [row("m/a", true), row("m/b", false)];
    const shared = { names: new Set<string>(), capped: true };
    expect(visibleMentions(rows, shared, false, true).map((r) => r.unread)).toEqual([undefined, undefined]);
    expect(visibleMentions(rows, shared, true, true)).toHaveLength(2);
  });
  // The shared unread result stopped at its cap and lists only spaces/A/messages/2.
  const cappedShared = {
    names: unreadMessageNames([{ messages: [message("spaces/A/messages/2", "2026-10-15T08:00:00Z")] }]),
    capped: true,
  };
  const completeShared = { ...cappedShared, capped: false };

  it("marks a mention unread from the unread-mentions search, even when the capped shared result misses it", () => {
    const rows = [
      row("spaces/A/messages/1", true),
      row("spaces/A/messages/2", false),
      row("spaces/B/messages/3", false),
    ];
    expect(visibleMentions(rows, cappedShared, false).map((r) => r.unread)).toEqual([true, true, false]);
    expect(visibleMentions(rows, cappedShared, true).map((r) => r.message.name)).toEqual([
      "spaces/A/messages/1",
      "spaces/A/messages/2",
    ]);
  });

  it("falls back to the shared result when the unread-mentions search failed", () => {
    const rows = [row("spaces/A/messages/1"), row("spaces/A/messages/2")];
    expect(visibleMentions(rows, completeShared, false).map((r) => r.unread)).toEqual([false, true]);
    expect(visibleMentions(rows, completeShared, true).map((r) => r.message.name)).toEqual(["spaces/A/messages/2"]);
  });

  it("leaves the state unknown, and the row visible in Unread Only, when neither can tell", () => {
    const rows = [row("spaces/A/messages/1"), row("spaces/A/messages/2")];
    expect(visibleMentions(rows, cappedShared, false).map((r) => r.unread)).toEqual([undefined, true]);
    expect(visibleMentions(rows, cappedShared, true).map((r) => r.message.name)).toEqual([
      "spaces/A/messages/1",
      "spaces/A/messages/2",
    ]);
    expect(visibleMentions(rows, undefined, true).map((r) => r.unread)).toEqual([undefined, undefined]);
  });

  it("shows none in Unread Only when every mention is read", () => {
    expect(visibleMentions([row("spaces/B/messages/3", false)], cappedShared, true)).toEqual([]);
  });
});

describe("withMentionsRead", () => {
  it("marks the rows in the conversations marked as read as read", () => {
    const rows = mentionRows(
      [message("spaces/A/messages/1", "2026-10-15T09:00:00Z"), message("spaces/B/messages/2", "2026-10-15T08:00:00Z")],
      new Map(),
      {},
      { names: ["spaces/A/messages/1", "spaces/B/messages/2"], complete: true },
    );
    const after = withMentionsRead({ rows, capped: false }, ["spaces/A"]);
    expect(after?.rows.map((r) => r.unread)).toEqual([false, true]);
    expect(withMentionsRead(undefined, ["spaces/A"])).toBeUndefined();
  });
});

describe("mentionsSubtitle", () => {
  const rows = (...states: (boolean | undefined)[]) => states.map((unread) => ({ unread }));

  it("counts mentions in the window and the unread ones", () => {
    expect(mentionsSubtitle(rows(true, true, false, false, false), false, 7)).toBe("5 in the last 7 days · 2 unread");
    expect(mentionsSubtitle(rows(false), false, 1)).toBe("1 in the last day");
    expect(mentionsSubtitle([...rows(true, true, true), ...rows(...Array<boolean>(17).fill(false))], true, 14)).toBe(
      "20+ in the last 14 days · 3 unread",
    );
  });

  it("marks the unread count as a minimum when some states are unknown", () => {
    expect(mentionsSubtitle(rows(true, undefined, false), false, 7)).toBe("3 in the last 7 days · 1+ unread");
    expect(mentionsSubtitle(rows(undefined, false), false, 7)).toBe("2 in the last 7 days");
  });
});
