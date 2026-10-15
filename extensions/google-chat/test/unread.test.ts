import { describe, expect, it } from "vitest";

import type { Message, Space } from "../src/api/types";
import { GoogleApiError } from "../src/helpers/errors";
import {
  collectUnread,
  countLabel,
  countMentions,
  countUnread,
  freshSharedUnread,
  DEFAULT_LOOKBACK_DAYS,
  excludeOwnMessages,
  groupUnreadBySpace,
  isSpaceUnread,
  MarkReadError,
  messageSpaceName,
  parseLookbackDays,
  recentlyActiveSpaces,
  settleMarkRead,
  shouldFallBackFromSearch,
  UNREAD_CHECK_INCOMPLETE,
  unreadEmptyView,
  unreadMessagesFilter,
  unreadSearchFilter,
  UNREAD_CHECK_FAILED,
  unreadSubtitle,
  unreadLaunchTarget,
  unreadSummary,
  withoutSpaces,
  type UnreadResult,
  countsAsUnread,
} from "../src/helpers/unread";

const NOW = Date.parse("2026-10-14T12:00:00Z");
const ME = "users/111";
const space = (name: string, lastActiveTime?: string): Space => ({ name, lastActiveTime });
const message = (name: string, createTime: string, sender = "users/222", extra: Partial<Message> = {}): Message => ({
  name,
  createTime,
  sender: { name: sender },
  ...extra,
});
const mention = (user: string): Message["annotations"] => [
  { type: "USER_MENTION", userMention: { user: { name: user } } },
];

describe("unreadSearchFilter", () => {
  it("asks for unread messages created since the lookback start", () => {
    expect(unreadSearchFilter(14, new Date(NOW))).toBe('is_unread() AND create_time >= "2026-09-30T12:00:00.000Z"');
    expect(unreadSearchFilter(1, new Date(NOW))).toBe('is_unread() AND create_time >= "2026-10-13T12:00:00.000Z"');
  });

  it("is just is_unread() without a lookback", () => {
    expect(unreadSearchFilter(undefined)).toBe("is_unread()");
    expect(unreadSearchFilter(0)).toBe("is_unread()");
  });
});

describe("excludeOwnMessages", () => {
  it("drops messages sent by the signed-in user", () => {
    const messages = [
      message("spaces/A/messages/1", "2026-10-14T10:00:00Z", ME),
      message("spaces/A/messages/2", "2026-10-14T10:01:00Z"),
    ];
    expect(excludeOwnMessages(messages, ME).map((m) => m.name)).toEqual(["spaces/A/messages/2"]);
    expect(excludeOwnMessages(messages, undefined)).toHaveLength(2);
  });
});

describe("messageSpaceName", () => {
  it("uses message.space.name, else the resource name prefix", () => {
    expect(messageSpaceName({ name: "spaces/A/messages/1", space: { name: "spaces/A" } })).toBe("spaces/A");
    expect(messageSpaceName({ name: "spaces/B/messages/1.2" })).toBe("spaces/B");
  });
});

describe("groupUnreadBySpace", () => {
  const results: Message[] = [
    message("spaces/A/messages/1", "2026-10-14T09:00:00Z"),
    message("spaces/B/messages/1", "2026-10-14T11:00:00Z", "users/333"),
    message("spaces/A/messages/2", "2026-10-14T10:00:00Z", "users/333", { annotations: mention(ME) }),
    message("spaces/A/messages/3", "2026-10-14T10:30:00Z", ME),
    message("spaces/B/messages/1", "2026-10-14T11:00:00Z"),
    message("spaces/C/messages/1", "2026-10-13T08:00:00Z", "users/444", { annotations: mention("users/999") }),
  ];

  it("groups by space, newest unread space first, newest message first", () => {
    const groups = groupUnreadBySpace(results, ME);
    expect(groups.map((g) => g.spaceName)).toEqual(["spaces/B", "spaces/A", "spaces/C"]);
    expect(groups[1].messages.map((m) => m.name)).toEqual(["spaces/A/messages/2", "spaces/A/messages/1"]);
    expect(groups[1].latestTime).toBe("2026-10-14T10:00:00Z");
  });

  it("counts messages without duplicates or your own", () => {
    const groups = groupUnreadBySpace(results, ME);
    expect(groups.map((g) => g.count)).toEqual([1, 2, 1]);
    expect(countUnread(groups)).toBe(4);
  });

  it("marks mentions of you, by id or users/me, but not of others", () => {
    const groups = groupUnreadBySpace(
      [
        ...results,
        message("spaces/D/messages/1", "2026-10-12T08:00:00Z", "users/5", { annotations: mention("users/me") }),
      ],
      ME,
    );
    const byName = Object.fromEntries(groups.map((g) => [g.spaceName, g]));
    expect(byName["spaces/A"].mentioned).toBe(true);
    expect(byName["spaces/A"].mentions).toEqual(["spaces/A/messages/2"]);
    expect(byName["spaces/B"].mentioned).toBe(false);
    expect(byName["spaces/C"].mentioned).toBe(false);
    expect(byName["spaces/D"].mentioned).toBe(true);
  });

  it("returns nothing when only your own messages are unread", () => {
    expect(groupUnreadBySpace([message("spaces/A/messages/1", "2026-10-14T09:00:00Z", ME)], ME)).toEqual([]);
  });
});

describe("countLabel", () => {
  it("adds + when the count stopped at the cap", () => {
    expect(countLabel(37, false)).toBe("37");
    expect(countLabel(500, true)).toBe("500+");
  });
});

describe("unreadSummary", () => {
  it("describes totals across spaces", () => {
    expect(unreadSummary(37, false, 6)).toBe("37 unread in 6 spaces");
    expect(unreadSummary(1, false, 1)).toBe("1 unread in 1 space");
    expect(unreadSummary(500, true, 40)).toBe("500+ unread in 40 spaces");
    expect(unreadSummary(0, false, 0)).toBe("No unread messages");
  });

  it("doesn't claim zero when the search stopped before checking every result", () => {
    expect(unreadSummary(0, true, 0)).toBe(UNREAD_CHECK_INCOMPLETE);
    expect(unreadSummary(3, true, 2)).toBe("3+ unread in 2 spaces");
  });
});

describe("unreadEmptyView", () => {
  it("says the check is incomplete when capped", () => {
    expect(unreadEmptyView({ capped: true, source: "search" }, 14).title).toBe("Unread check incomplete");
  });

  it("says there's nothing unread otherwise", () => {
    expect(unreadEmptyView({ capped: false, source: "search" }, 14)).toEqual({
      title: "No unread messages",
      description: "Nothing unread from the last 14 days. Muted spaces aren't counted.",
    });
    expect(unreadEmptyView({ capped: false, source: "readState" }, 7).description).toBe(
      "Nothing after your read position in spaces active in the last 7 days.",
    );
    expect(unreadEmptyView(undefined, 14).title).toBe("No unread messages");
  });
});

describe("collectUnread", () => {
  /** `count` messages in spaces/A, newest first, from someone else; `reply` makes them thread replies. */
  const batch = (page: number, count: number, reply: boolean): Message[] =>
    Array.from({ length: count }, (_, i) =>
      message(`spaces/A/messages/${page}-${i}`, "2026-10-14T10:00:00Z", "users/222", { threadReply: reply }),
    );
  function pager(pages: Message[][], failAt?: number) {
    const calls: (string | undefined)[] = [];
    const fetchPage = async (token: string | undefined) => {
      calls.push(token);
      const index = token ? Number(token) : 0;
      if (index === failAt) throw new Error("Internal error encountered");
      return { messages: pages[index], nextPageToken: index + 1 < pages.length ? String(index + 1) : undefined };
    };
    return { calls, fetchPage };
  }
  const positionCalls: string[][] = [];
  const readPositions = async (names: string[]) => {
    positionCalls.push(names);
    return new Map(names.map((name): [string, string | undefined] => [name, "2026-10-14T09:00:00Z"]));
  };

  it("keeps paging past the cap while nothing counts, and stops once something does", async () => {
    // 5 pages of ignored thread replies, then a page with a top-level message.
    const pages = [0, 1, 2, 3, 4].map((p) => batch(p, 100, true));
    pages.push([...batch(5, 1, false), ...batch(55, 99, true)], batch(6, 100, false), batch(7, 100, false));
    const { calls, fetchPage } = pager(pages);
    positionCalls.length = 0;
    const found = await collectUnread({ fetchPage, readPositions, me: ME, cap: 500, scanLimit: 1000 });
    expect(found.messages.map((m) => m.name)).toEqual(["spaces/A/messages/5-0"]);
    expect(found.capped).toBe(true);
    expect(calls).toHaveLength(6);
    // Read positions are loaded once per space.
    expect(positionCalls).toEqual([["spaces/A"]]);
  });

  it("stops at the scan limit when nothing counts, and reports the check as incomplete", async () => {
    const pages = Array.from({ length: 12 }, (_, p) => batch(p, 100, true));
    const { calls, fetchPage } = pager(pages);
    const found = await collectUnread({ fetchPage, readPositions, me: ME, cap: 500, scanLimit: 1000 });
    expect(found).toEqual({ messages: [], capped: true });
    expect(calls).toHaveLength(10);
    expect(unreadSubtitle(found.messages.length, found.capped, 0, 0)).toBe("Unread check incomplete");
  });

  it("stops at the cap when messages count, and isn't capped when the results end", async () => {
    const many = Array.from({ length: 7 }, (_, p) => batch(p, 100, false));
    const capped = await collectUnread({ ...pager(many), readPositions, me: ME, cap: 500, scanLimit: 1000 });
    expect(capped.messages).toHaveLength(500);
    expect(capped.capped).toBe(true);
    const few = await collectUnread({ ...pager([batch(0, 3, true)]), readPositions, me: ME });
    expect(few).toEqual({ messages: [], capped: false });
  });

  it("drops messages older than the read position and your own", async () => {
    const pages = [
      [
        message("spaces/A/messages/old", "2026-10-14T08:00:00Z"),
        message("spaces/A/messages/mine", "2026-10-14T10:00:00Z", ME),
        message("spaces/A/messages/new", "2026-10-14T10:00:00Z"),
      ],
    ];
    const found = await collectUnread({ ...pager(pages), readPositions, me: ME });
    expect(found.messages.map((m) => m.name)).toEqual(["spaces/A/messages/new"]);
  });

  it("throws when the first page fails, and keeps earlier pages when a later one does", async () => {
    const pages = [batch(0, 100, false), batch(1, 100, false)];
    await expect(collectUnread({ ...pager(pages, 0), readPositions, me: ME })).rejects.toThrow("Internal error");
    const errors: unknown[] = [];
    const found = await collectUnread({
      ...pager(pages, 1),
      readPositions,
      me: ME,
      onPageError: (error) => errors.push(error),
    });
    expect(found.messages).toHaveLength(100);
    expect(found.capped).toBe(true);
    expect(errors).toHaveLength(1);
  });
});

describe("settleMarkRead", () => {
  const ok = (): PromiseSettledResult<unknown> => ({ status: "fulfilled", value: {} });
  const failed = (reason: unknown): PromiseSettledResult<unknown> => ({ status: "rejected", reason });

  it("marks everything when every write succeeds", () => {
    expect(settleMarkRead(["spaces/A", "spaces/B"], [ok(), ok()])).toEqual({ marked: ["spaces/A", "spaces/B"] });
  });

  it("throws the failure itself when nothing was marked", () => {
    const error = new GoogleApiError("Permission denied", { status: 403 });
    expect(settleMarkRead(["spaces/A"], [failed(error)])).toEqual({ marked: [], error });
  });

  it("lists the marked spaces when only some writes failed", () => {
    const result = settleMarkRead(["spaces/A", "spaces/B", "spaces/C"], [ok(), failed(new Error("boom")), ok()]);
    expect(result.marked).toEqual(["spaces/A", "spaces/C"]);
    expect(result.error).toBeInstanceOf(MarkReadError);
    const error = result.error as MarkReadError;
    expect(error.marked).toEqual(["spaces/A", "spaces/C"]);
    expect(error.failed).toEqual(["spaces/B"]);
    expect(error.message).toBe("Couldn't mark 1 of 3 conversations as read: boom");
  });

  it("removes only the marked spaces from the result", () => {
    const result: UnreadResult<{ spaceName: string; count: number; mentioned: boolean }> = {
      spaces: [
        { spaceName: "spaces/A", count: 2, mentioned: false },
        { spaceName: "spaces/B", count: 1, mentioned: false },
      ],
      total: 3,
      capped: false,
      source: "search",
    };
    const { marked } = settleMarkRead(["spaces/A", "spaces/B"], [ok(), failed(new Error("boom"))]);
    expect(withoutSpaces(result, marked).spaces.map((s) => s.spaceName)).toEqual(["spaces/B"]);
  });
});

describe("withoutSpaces", () => {
  const result: UnreadResult<{ spaceName: string; count: number; mentioned: boolean }> = {
    spaces: [
      { spaceName: "spaces/A", count: 3, mentioned: true },
      { spaceName: "spaces/B", count: 2, mentioned: false },
    ],
    total: 5,
    capped: true,
    source: "search",
  };

  it("removes marked spaces and their counts", () => {
    const next = withoutSpaces(result, ["spaces/A"]);
    expect(next.spaces.map((s) => s.spaceName)).toEqual(["spaces/B"]);
    expect(next.total).toBe(2);
    expect(next.capped).toBe(true);
  });

  it("keeps the cap when nothing is left, as results past it were never checked", () => {
    expect(withoutSpaces(result, ["spaces/A", "spaces/B"])).toMatchObject({ spaces: [], total: 0, capped: true });
    expect(withoutSpaces({ ...result, capped: false }, ["spaces/A", "spaces/B"]).capped).toBe(false);
  });
});

describe("shouldFallBackFromSearch", () => {
  it("falls back when search is rejected", () => {
    expect(shouldFallBackFromSearch(new GoogleApiError("bad filter", { status: 400 }))).toBe(true);
    expect(shouldFallBackFromSearch(new GoogleApiError("Permission denied", { status: 403 }))).toBe(true);
  });

  it("doesn't fall back for sign-in, scope, rate-limit or non-API errors", () => {
    expect(shouldFallBackFromSearch(new GoogleApiError("expired", { status: 401 }))).toBe(false);
    expect(
      shouldFallBackFromSearch(
        new GoogleApiError("Request had insufficient authentication scopes.", {
          status: 403,
          reason: "ACCESS_TOKEN_SCOPE_INSUFFICIENT",
        }),
      ),
    ).toBe(false);
    expect(shouldFallBackFromSearch(new GoogleApiError("slow down", { status: 429 }))).toBe(false);
    expect(shouldFallBackFromSearch(new Error("fetch failed"))).toBe(false);
  });
});

describe("parseLookbackDays", () => {
  it("parses whole days within 1..90 and falls back otherwise", () => {
    expect(parseLookbackDays("7")).toBe(7);
    expect(parseLookbackDays(" 30 ")).toBe(30);
    expect(parseLookbackDays("500")).toBe(90);
    expect(parseLookbackDays("0")).toBe(DEFAULT_LOOKBACK_DAYS);
    expect(parseLookbackDays("abc")).toBe(DEFAULT_LOOKBACK_DAYS);
    expect(parseLookbackDays(undefined)).toBe(DEFAULT_LOOKBACK_DAYS);
  });
});

describe("read-state fallback", () => {
  it("isSpaceUnread: unread only when the last message is after the last read time", () => {
    expect(isSpaceUnread(space("s", "2026-10-14T10:00:00Z"), { lastReadTime: "2026-10-14T09:00:00Z" })).toBe(true);
    expect(isSpaceUnread(space("s", "2026-10-14T10:00:00Z"), { lastReadTime: "2026-10-14T10:00:00Z" })).toBe(false);
    expect(isSpaceUnread(space("s", "2026-10-14T10:00:00.500Z"), { lastReadTime: "2026-10-14T15:00:00+05:00" })).toBe(
      true,
    );
  });

  it("isSpaceUnread: skips spaces without a read time instead of guessing", () => {
    expect(isSpaceUnread(space("s", "2026-10-14T10:00:00Z"), {})).toBe(false);
    expect(isSpaceUnread(space("s", "2026-10-14T10:00:00Z"), undefined)).toBe(false);
    expect(isSpaceUnread(space("s"), { lastReadTime: "2026-10-14T10:00:00Z" })).toBe(false);
  });

  it("unreadMessagesFilter lists messages after the last read time only", () => {
    expect(unreadMessagesFilter({ lastReadTime: "2026-10-14T09:00:00Z" })).toBe('create_time > "2026-10-14T09:00:00Z"');
    expect(unreadMessagesFilter(undefined)).toBeUndefined();
  });

  it("unreadMessagesFilter starts at the lookback start when the read position is older", () => {
    expect(unreadMessagesFilter({ lastReadTime: "2026-06-01T09:00:00Z" }, 14, NOW)).toBe(
      'create_time > "2026-09-30T12:00:00.000Z"',
    );
    expect(unreadMessagesFilter({ lastReadTime: "2026-10-14T09:00:00Z" }, 14, NOW)).toBe(
      'create_time > "2026-10-14T09:00:00Z"',
    );
    expect(unreadMessagesFilter(undefined, 14, NOW)).toBeUndefined();
  });

  it("recentlyActiveSpaces keeps spaces active within the window, newest first", () => {
    const spaces = [
      space("old", "2026-09-01T00:00:00Z"),
      space("a", "2026-10-13T00:00:00Z"),
      space("b", "2026-10-14T11:00:00Z"),
      space("never"),
    ];
    expect(recentlyActiveSpaces(spaces, 14, NOW).map((s) => s.name)).toEqual(["b", "a"]);
  });
});

describe("unreadSubtitle", () => {
  it("shows the total and spaces, plus mentions when there are any", () => {
    expect(unreadSubtitle(12, false, 4, 0)).toBe("12 unread · 4 spaces");
    expect(unreadSubtitle(12, false, 4, 2)).toBe("12 unread · 4 spaces · 2 mentions");
    expect(unreadSubtitle(1, false, 1, 1)).toBe("1 unread · 1 space · 1 mention");
  });

  it("says 500+ at the cap and No unread messages when there are none", () => {
    expect(unreadSubtitle(500, true, 40, 0)).toBe("500+ unread");
    expect(unreadSubtitle(500, true, 40, 3)).toBe("500+ unread · 3 mentions");
    expect(unreadSubtitle(0, false, 0, 0)).toBe("No unread messages");
    expect(UNREAD_CHECK_FAILED).toBe("Couldn't check unread");
  });

  it("says N+ when capped, and doesn't claim zero when nothing counted before the cap", () => {
    expect(unreadSubtitle(3, true, 2, 0)).toBe("3+ unread");
    expect(unreadSubtitle(0, true, 0, 0)).toBe("Unread check incomplete");
  });

  it("counts mentioning messages across spaces", () => {
    expect(countMentions([{ mentions: ["a", "b"] }, { mentions: [] }, { mentions: ["c"] }])).toBe(3);
  });
});

describe("freshSharedUnread", () => {
  const entry = { at: NOW - 60_000, lookbackDays: 14, result: "shared" };

  it("reuses a result under the max age for the same lookback", () => {
    expect(freshSharedUnread(entry, 14, 2 * 60_000, NOW)).toBe("shared");
  });

  it("ignores old results, other lookbacks, a max age of 0 and a missing entry", () => {
    expect(freshSharedUnread(entry, 14, 30_000, NOW)).toBeUndefined();
    expect(freshSharedUnread(entry, 7, 2 * 60_000, NOW)).toBeUndefined();
    expect(freshSharedUnread(entry, 14, 0, NOW)).toBeUndefined();
    expect(freshSharedUnread(undefined, 14, 2 * 60_000, NOW)).toBeUndefined();
    expect(freshSharedUnread({ ...entry, at: NOW + 60_000 }, 14, 2 * 60_000, NOW)).toBeUndefined();
  });
});

describe("unreadLaunchTarget", () => {
  const entry = (name: string, extra: Partial<Space> = {}) => ({ item: { space: { name, ...extra } } });

  it("opens the conversation when exactly one has unread messages, using its spaceUri", () => {
    expect(unreadLaunchTarget([entry("spaces/A", { spaceUri: "https://chat.google.com/room/A?cls=7" })])).toEqual({
      action: "open",
      url: "https://chat.google.com/room/A?cls=7",
    });
    expect(unreadLaunchTarget([entry("spaces/D", { spaceType: "DIRECT_MESSAGE" })])).toEqual({
      action: "open",
      url: "https://chat.google.com/dm/D",
    });
  });

  it("opens My Messages for none or several", () => {
    expect(unreadLaunchTarget([])).toEqual({ action: "list" });
    expect(unreadLaunchTarget([entry("spaces/A"), entry("spaces/B")])).toEqual({ action: "list" });
  });
});

describe("countsAsUnread", () => {
  const ME = "users/111";
  const read = "2026-10-14T10:00:00Z";
  const mention = { type: "USER_MENTION", userMention: { type: "MENTION", user: { name: ME } } };

  it("counts a top-level message newer than the space's read position", () => {
    expect(countsAsUnread({ createTime: "2026-10-14T11:00:00Z" }, read, ME)).toBe(true);
  });

  it("drops anything older than the space's read position", () => {
    expect(countsAsUnread({ createTime: "2026-10-14T09:00:00Z" }, read, ME)).toBe(false);
    expect(
      countsAsUnread(
        { createTime: "2026-10-14T09:00:00Z", threadReply: true, annotations: [mention] } as never,
        read,
        ME,
      ),
    ).toBe(false);
  });

  it("drops thread replies that don't mention you, even when newer", () => {
    expect(countsAsUnread({ createTime: "2026-10-14T11:00:00Z", threadReply: true }, read, ME)).toBe(false);
  });

  it("keeps thread replies that mention you", () => {
    expect(
      countsAsUnread(
        { createTime: "2026-10-14T11:00:00Z", threadReply: true, annotations: [mention] } as never,
        read,
        ME,
      ),
    ).toBe(true);
  });

  it("without a read position, keeps top-level messages and mentions only", () => {
    expect(countsAsUnread({ createTime: "2026-10-14T11:00:00Z" }, undefined, ME)).toBe(true);
    expect(countsAsUnread({ createTime: "2026-10-14T11:00:00Z", threadReply: true }, undefined, ME)).toBe(false);
  });
});
