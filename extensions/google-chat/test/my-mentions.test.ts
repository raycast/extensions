import { afterEach, describe, expect, it, vi } from "vitest";

import type { Message, SpaceItem } from "../src/api/types";
import {
  collectMentions,
  DEFAULT_MENTIONS_DAYS,
  DEFAULT_MENTIONS_LIMIT,
  mentionRows,
  mentionsSearchFilter,
  mentionsSubtitle,
  parseMentionsDays,
  parseMentionsLimit,
  selectMentions,
  unreadMessageNames,
  visibleMentions,
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

describe("mentionsSearchFilter", () => {
  it("asks for mentions of the caller from the last N days", () => {
    expect(mentionsSearchFilter(7, NOW)).toBe(
      'annotations.user_mentions.user.name:users/me AND create_time >= "2026-10-08T12:00:00.000Z"',
    );
    expect(mentionsSearchFilter(1, NOW)).toBe(
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

describe("collectMentions", () => {
  afterEach(() => {
    vi.useRealTimers();
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

  it("sends the same filter on every page and pages past your own messages", async () => {
    const all = [...mentions("spaces/A", 3, 0, ME), ...mentions("spaces/A", 4, 3)];
    const { requests, fetchPage } = pager(all);
    const found = await collectMentions({ fetchPage, days: 7, limit: 3, me: ME, now: NOW });
    expect(requests).toHaveLength(2);
    expect(requests.map((r) => r.filter)).toEqual([mentionsSearchFilter(7, NOW), mentionsSearchFilter(7, NOW)]);
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

  it("builds the filter once, so later pages don't pick up a newer time", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    // Each page takes a minute; your own messages fill the first two pages.
    const own = pager([...mentions("spaces/A", 4, 0, ME), ...mentions("spaces/A", 2, 4)]);
    const ownSlow = async (request: MentionsPageRequest) => {
      vi.setSystemTime(Date.now() + 60_000);
      return own.fetchPage(request);
    };
    await collectMentions({ fetchPage: ownSlow, days: 7, limit: 2, me: ME });
    expect(own.requests).toHaveLength(3);
    expect(new Set(own.requests.map((r) => r.filter)).size).toBe(1);
    expect(own.requests[0].filter).toBe(mentionsSearchFilter(7, NOW));
  });

  it("stops at the first page when it fills the limit, and isn't capped when nothing is left", async () => {
    const full = pager(mentions("spaces/A", 25));
    const capped = await collectMentions({ fetchPage: full.fetchPage, days: 7, limit: 20, me: ME, now: NOW });
    expect(full.requests).toHaveLength(1);
    expect(capped.messages).toHaveLength(20);
    expect(capped.capped).toBe(true);

    const few = pager(mentions("spaces/A", 4));
    const all = await collectMentions({ fetchPage: few.fetchPage, days: 7, limit: 20, me: ME, now: NOW });
    expect(all.messages).toHaveLength(4);
    expect(all.capped).toBe(false);
  });

  it("stops after the page limit", async () => {
    const { requests, fetchPage } = pager(mentions("spaces/A", 10, 0, ME));
    const found = await collectMentions({ fetchPage, days: 7, limit: 2, me: ME, now: NOW, maxPages: 3 });
    expect(requests).toHaveLength(3);
    expect(found).toEqual({ messages: [], capped: true });
  });

  it("throws on a first-page failure and keeps earlier pages on a later one", async () => {
    const first = pager(mentions("spaces/A", 5), { failOnPage: 0 });
    await expect(collectMentions({ fetchPage: first.fetchPage, days: 7, limit: 2, me: ME })).rejects.toThrow();

    const errors: unknown[] = [];
    const later = pager([...mentions("spaces/A", 2, 0, ME), ...mentions("spaces/A", 3, 2)], { failOnPage: 1 });
    const found = await collectMentions({
      fetchPage: later.fetchPage,
      days: 7,
      limit: 2,
      me: ME,
      now: NOW,
      onPageError: (error) => errors.push(error),
    });
    expect(found).toEqual({ messages: [], capped: true });
    expect(errors).toHaveLength(1);
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

  it("gives a conversation it can't resolve a placeholder title", () => {
    const rows = mentionRows([message("spaces/Z/messages/1", "2026-10-15T08:00:00Z")], new Map(), {});
    expect(rows[0].item).toEqual({ space: { name: "spaces/Z" }, title: "Conversation", kind: "space" });
  });
});

describe("unread flag and Unread Only", () => {
  const rows = [
    { message: { name: "spaces/A/messages/1" } },
    { message: { name: "spaces/A/messages/2" } },
    { message: { name: "spaces/B/messages/3" } },
  ];
  const groups = [
    { messages: [message("spaces/A/messages/2", "2026-10-15T08:00:00Z")] },
    { messages: [message("spaces/C/messages/9", "2026-10-15T08:00:00Z")] },
  ];

  it("marks a mention unread when the shared unread result lists the message", () => {
    const names = unreadMessageNames(groups);
    expect(visibleMentions(rows, names, false).map((r) => r.unread)).toEqual([false, true, false]);
  });

  it("keeps only unread mentions in Unread Only, and none when nothing is unread", () => {
    expect(visibleMentions(rows, unreadMessageNames(groups), true).map((r) => r.message.name)).toEqual([
      "spaces/A/messages/2",
    ]);
    expect(visibleMentions(rows, unreadMessageNames([]), true)).toEqual([]);
  });
});

describe("mentionsSubtitle", () => {
  it("counts mentions in the window and the unread ones", () => {
    expect(mentionsSubtitle(5, false, 2, 7)).toBe("5 in the last 7 days · 2 unread");
    expect(mentionsSubtitle(1, false, 0, 1)).toBe("1 in the last day");
    expect(mentionsSubtitle(20, true, 3, 14)).toBe("20+ in the last 14 days · 3 unread");
  });
});
