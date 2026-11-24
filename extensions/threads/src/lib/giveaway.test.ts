import { describe, expect, it } from "vitest";
import {
  countMentions,
  drawWinners,
  filterEntries,
  formatResults,
  parseKeywords,
  parseWholeNumber,
  secureShuffle,
} from "./giveaway";
import type { ThreadsReply } from "./threads-api";

function reply(overrides: Partial<ThreadsReply> & { username: string }): ThreadsReply {
  return {
    id: `${overrides.username}-${overrides.timestamp ?? "t"}`,
    text: "",
    timestamp: "2026-09-01T10:00:00+0000",
    permalink: "",
    ...overrides,
  };
}

const none = { onePerAccount: false, requireText: false, keywords: [], minMentions: 0, excludedUsernames: [] };

describe("parseKeywords", () => {
  it("splits on ASCII and full-width commas, trims, lowercases, and drops blanks", () => {
    expect(parseKeywords(" Hello, World ，Foo,, ")).toEqual(["hello", "world", "foo"]);
  });
});

describe("parseWholeNumber", () => {
  it("accepts a plain whole number, surrounding spaces allowed", () => {
    expect(parseWholeNumber("10")).toBe(10);
    expect(parseWholeNumber(" 3 ")).toBe(3);
    expect(parseWholeNumber("0")).toBe(0);
  });

  it("rejects anything parseInt would have half-read", () => {
    for (const text of ["1O", "2.5", "1e3", "-1", "3 prizes", "", " "]) {
      expect(parseWholeNumber(text)).toBeUndefined();
    }
  });
});

describe("countMentions", () => {
  it("counts @-handles with dots and underscores", () => {
    expect(countMentions("hi @a.b @c_d and @e")).toBe(3);
    expect(countMentions("no mentions")).toBe(0);
  });

  it("counts distinct accounts, so one friend tagged twice is one friend", () => {
    expect(countMentions("@bob @bob @BOB")).toBe(1);
  });

  it("does not count an email address as a tag", () => {
    expect(countMentions("mail me at a@b.com and c.d@e.org")).toBe(0);
    expect(countMentions("ask me@example.com or @amy")).toBe(1);
  });

  it("drops sentence punctuation, and does not count a bare run of dots", () => {
    expect(countMentions("thanks @amy.")).toBe(1);
    expect(countMentions("thanks @amy. and @amy")).toBe(1);
    expect(countMentions("hey @... bye")).toBe(0);
    expect(countMentions("@. @amy")).toBe(1);
  });

  it("counts a mention that follows CJK text with no space", () => {
    expect(countMentions("謝謝@amy 和@bob")).toBe(2);
  });

  it("ignores the host's own handle", () => {
    expect(countMentions("@host @amy", ["host"])).toBe(1);
    expect(countMentions("@host @amy", ["@Host"])).toBe(1);
  });
});

describe("filterEntries", () => {
  it("sorts oldest first and keeps each account's earliest reply when one per account is on", () => {
    const entries = [
      reply({ username: "bob", timestamp: "2026-09-02T00:00:00+0000" }),
      reply({ username: "Bob", timestamp: "2026-09-01T00:00:00+0000" }),
      reply({ username: "amy", timestamp: "2026-09-03T00:00:00+0000" }),
    ];
    const result = filterEntries(entries, { ...none, onePerAccount: true });
    expect(result.map((r) => `${r.username}@${r.timestamp}`)).toEqual([
      "Bob@2026-09-01T00:00:00+0000",
      "amy@2026-09-03T00:00:00+0000",
    ]);
  });

  it("applies text, keyword, mention, cutoff, and exclusion conditions", () => {
    const entries = [
      reply({ username: "empty", text: "   " }),
      reply({ username: "keyword", text: "I want the PRIZE" }),
      reply({ username: "mentions", text: "prize @a @b" }),
      reply({ username: "late", text: "prize", timestamp: "2026-09-10T00:00:00+0000" }),
      reply({ username: "Banned", text: "prize @x @y" }),
    ];

    expect(filterEntries(entries, { ...none, requireText: true }).map((r) => r.username)).not.toContain("empty");
    expect(filterEntries(entries, { ...none, keywords: ["prize"] }).map((r) => r.username)).toEqual([
      "keyword",
      "mentions",
      "Banned",
      "late",
    ]);
    expect(filterEntries(entries, { ...none, minMentions: 2 }).map((r) => r.username)).toEqual(["mentions", "Banned"]);
    // Tagging the host is not tagging a friend.
    expect(
      filterEntries([reply({ username: "sneaky", text: "@me @me @amy" })], {
        ...none,
        minMentions: 2,
        hostUsername: "me",
      }),
    ).toHaveLength(0);
    expect(
      filterEntries(entries, { ...none, before: new Date("2026-09-05T00:00:00Z") }).map((r) => r.username),
    ).not.toContain("late");
    expect(filterEntries(entries, { ...none, excludedUsernames: ["banned"] }).map((r) => r.username)).not.toContain(
      "Banned",
    );
  });

  it("ignores an invalid cutoff date", () => {
    const entries = [reply({ username: "a" })];
    expect(filterEntries(entries, { ...none, before: new Date("nope") })).toHaveLength(1);
  });
});

describe("drawWinners", () => {
  const identity = <T>(items: readonly T[]) => [...items];

  it("fills prizes in order and never lets one account win twice", () => {
    const entries = [
      reply({ username: "a", id: "1" }),
      reply({ username: "A", id: "2" }),
      reply({ username: "b", id: "3" }),
      reply({ username: "c", id: "4" }),
    ];
    const outcome = drawWinners(
      entries,
      [
        { name: "Gold", count: 1 },
        { name: "Silver", count: 2 },
      ],
      identity,
    );
    expect(outcome.results.map((r) => r.winners.map((w) => w.id))).toEqual([["1"], ["3", "4"]]);
    expect(outcome).toMatchObject({ pool: 4, won: 3, shortfall: false });
  });

  it("reports a shortfall when there are fewer accounts than prizes", () => {
    const outcome = drawWinners([reply({ username: "only" })], [{ name: "Prize", count: 3 }], identity);
    expect(outcome.results[0].winners).toHaveLength(1);
    expect(outcome).toMatchObject({ won: 1, shortfall: true });
  });

  it("uses the shuffle it is given", () => {
    const entries = [reply({ username: "first" }), reply({ username: "second" })];
    const reversed = <T>(items: readonly T[]) => [...items].reverse();
    const outcome = drawWinners(entries, [{ name: "Prize", count: 1 }], reversed);
    expect(outcome.results[0].winners[0].username).toBe("second");
  });
});

describe("secureShuffle", () => {
  it("returns a permutation without mutating the input", () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const output = secureShuffle(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect([...output].sort((a, b) => a - b)).toEqual(input);
  });
});

describe("formatResults", () => {
  it("lists each prize with numbered winners", () => {
    const text = formatResults([
      { prize: { name: "Gold", count: 1 }, winners: [reply({ username: "amy" })] },
      { prize: { name: "Silver", count: 2 }, winners: [reply({ username: "bob" }), reply({ username: "cat" })] },
    ]);
    expect(text).toBe("🎁 Gold × 1\n1. @amy\n\n🎁 Silver × 2\n1. @bob\n2. @cat");
  });
});
