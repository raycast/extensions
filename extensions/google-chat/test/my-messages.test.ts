import { describe, expect, it } from "vitest";

import type { Message } from "../src/api/types";
import {
  choosePreview,
  isOwnMessage,
  latestDate,
  namesFor,
  needsLatestCheck,
  parseView,
  previewText,
  previewUsers,
  planReadPage,
  READ_PAGE_SIZE,
  resolveView,
  splitSections,
  withLatestDetails,
  youReplied,
} from "../src/helpers/my-messages";

const ME = "users/111";
const message = (name: string, createTime: string, sender = "users/222", extra: Partial<Message> = {}): Message => ({
  name,
  createTime,
  sender: { name: sender },
  ...extra,
});

describe("isOwnMessage", () => {
  it("matches your user id or users/me", () => {
    expect(isOwnMessage(message("m", "2026-10-14T10:00:00Z", ME), ME)).toBe(true);
    expect(isOwnMessage(message("m", "2026-10-14T10:00:00Z", "users/me"), ME)).toBe(true);
    expect(isOwnMessage(message("m", "2026-10-14T10:00:00Z"), ME)).toBe(false);
    expect(isOwnMessage({ sender: undefined }, ME)).toBe(false);
  });
});

describe("choosePreview", () => {
  it("picks the newest message from someone else, skipping your own", () => {
    const messages = [
      message("old", "2026-10-14T08:00:00Z"),
      message("mine", "2026-10-14T11:00:00Z", ME),
      message("newest-other", "2026-10-14T10:00:00Z", "users/333"),
    ];
    expect(choosePreview(messages, ME)?.name).toBe("newest-other");
  });

  it("doesn't depend on input order and returns nothing when every message is yours", () => {
    const messages = [message("a", "2026-10-14T08:00:00Z"), message("b", "2026-10-14T09:00:00Z")];
    expect(choosePreview(messages, ME)?.name).toBe("b");
    expect(choosePreview([...messages].reverse(), ME)?.name).toBe("b");
    expect(choosePreview([message("mine", "2026-10-14T08:00:00Z", ME)], ME)).toBeUndefined();
    expect(choosePreview([], ME)).toBeUndefined();
  });
});

describe("youReplied", () => {
  it("is true only when the newest message is yours", () => {
    expect(youReplied([message("a", "2026-10-14T08:00:00Z"), message("b", "2026-10-14T09:00:00Z", ME)], ME)).toBe(true);
    expect(youReplied([message("a", "2026-10-14T10:00:00Z"), message("b", "2026-10-14T09:00:00Z", ME)], ME)).toBe(
      false,
    );
    expect(youReplied([], ME)).toBe(false);
  });

  it("needsLatestCheck: only when the space was active after its newest unread message", () => {
    expect(needsLatestCheck("2026-10-14T10:00:05Z", "2026-10-14T10:00:00Z")).toBe(true);
    expect(needsLatestCheck("2026-10-14T10:00:00Z", "2026-10-14T10:00:00Z")).toBe(false);
    expect(needsLatestCheck("2026-10-14T10:00:00.000000Z", "2026-10-14T10:00:00Z")).toBe(false);
    expect(needsLatestCheck(undefined, "2026-10-14T10:00:00Z")).toBe(false);
    expect(needsLatestCheck("2026-10-14T10:00:00Z", undefined)).toBe(true);
  });
});

describe("previewText", () => {
  it("shows Sender: text in plain text with mentions as @Name", () => {
    const m = message("spaces/A/messages/1", "2026-10-14T10:00:00Z", "users/222", {
      text: "*Heads up* <users/111> see <https://example.com|the doc>",
      annotations: [{ type: "USER_MENTION", userMention: { user: { name: ME } } }],
    });
    const names = { "users/222": "Sara Khan", [ME]: "Alex" };
    expect(previewText(m, names)).toBe("Sara Khan: Heads up @Alex see the doc");
  });

  it("uses the DM's person when the sender's name is unknown", () => {
    const m = message("spaces/D/messages/1", "2026-10-14T10:00:00Z", "users/222", { text: "hi" });
    expect(previewText(m, {}, "Ali Raza")).toBe("Ali Raza: hi");
    expect(previewText(m, {})).toBe("Unknown: hi");
  });

  it("previewUsers and namesFor keep only the sender and mentioned people", () => {
    const m = message("spaces/A/messages/1", "2026-10-14T10:00:00Z", "users/222", {
      annotations: [
        { type: "USER_MENTION", userMention: { user: { name: "users/333" } } },
        { type: "USER_MENTION", userMention: { user: { name: "users/all" } } },
      ],
    });
    expect(previewUsers(m)).toEqual(["users/222", "users/333"]);
    expect(namesFor(m, { "users/222": "Sara", "users/333": "Ali", "users/444": "Hina" })).toEqual({
      "users/222": "Sara",
      "users/333": "Ali",
    });
    expect(namesFor(undefined, { "users/222": "Sara" })).toEqual({});
  });
});

describe("splitSections", () => {
  const row = (name: string) => ({ item: { space: { name } } });

  it("keeps unread conversations out of Read and drops duplicates", () => {
    const unread = [{ spaceName: "spaces/B" }, { spaceName: "spaces/D" }];
    const rows = [row("spaces/A"), row("spaces/B"), row("spaces/C"), row("spaces/A"), row("spaces/D")];
    const split = splitSections(unread, rows);
    expect(split.unread.map((u) => u.spaceName)).toEqual(["spaces/B", "spaces/D"]);
    expect(split.read.map((r) => r.item.space.name)).toEqual(["spaces/A", "spaces/C"]);
  });

  it("moves a conversation to Read once it's no longer unread", () => {
    expect(splitSections([], [row("spaces/B")]).read).toHaveLength(1);
  });

  it("shows a conversation read elsewhere under Read when the fresh unread result drops it", () => {
    // The Read page loaded while B and D were unread; the fresh unread result lists only D.
    const page = planReadPage(
      [{ name: "spaces/A" }, { name: "spaces/B" }, { name: "spaces/D" }],
      0,
      new Set(["spaces/B", "spaces/D"]),
    );
    const rows = page.items.map((space) => row(space.name));
    const split = splitSections([{ spaceName: "spaces/D" }], rows);
    expect(split.read.map((r) => r.item.space.name)).toEqual(["spaces/A", "spaces/B"]);
  });
});

describe("planReadPage", () => {
  const spaces = Array.from({ length: 60 }, (_, i) => ({ name: `spaces/${i}` }));
  const none = new Set<string>();

  it("takes 25 per page and says whether more follow", () => {
    expect(READ_PAGE_SIZE).toBe(25);
    expect(planReadPage(spaces, 0, none)).toEqual({ items: spaces.slice(0, 25), nextOffset: 25, hasMore: true });
    expect(planReadPage(spaces, 25, none)).toEqual({ items: spaces.slice(25, 50), nextOffset: 50, hasMore: true });
    expect(planReadPage(spaces, 50, none)).toEqual({ items: spaces.slice(50, 60), nextOffset: 60, hasMore: false });
    expect(planReadPage(spaces, 60, none)).toEqual({ items: [], nextOffset: 60, hasMore: false });
  });

  it("has no more pages when the list ends exactly on a page boundary", () => {
    expect(planReadPage(spaces.slice(0, 50), 25, none).hasMore).toBe(false);
    expect(planReadPage([], 0, none)).toEqual({ items: [], nextOffset: 0, hasMore: false });
    expect(planReadPage(spaces, 0, none, 10).items).toHaveLength(10);
  });

  it("keeps unread conversations in the page without counting them toward its size", () => {
    const unread = new Set(["spaces/1", "spaces/3"]);
    const page = planReadPage(spaces, 0, unread, 5);
    expect(page.items.map((s) => s.name)).toEqual([0, 1, 2, 3, 4, 5, 6].map((i) => `spaces/${i}`));
    expect(page.nextOffset).toBe(7);
    expect(planReadPage(spaces, page.nextOffset, unread, 5).items[0].name).toBe("spaces/7");
  });
});

describe("view resolution", () => {
  it("parseView accepts only all and unread", () => {
    expect(parseView("all")).toBe("all");
    expect(parseView("unread")).toBe("unread");
    expect(parseView("Unread")).toBeUndefined();
    expect(parseView(undefined)).toBeUndefined();
  });

  it("a launch context of unread wins for that launch", () => {
    expect(resolveView({ launch: "unread", stored: "all", preference: "all" })).toBe("unread");
    expect(resolveView({ launch: "all", stored: "unread", preference: "all" })).toBe("unread");
    expect(resolveView({ launch: "bogus", stored: "all", preference: "unread" })).toBe("all");
  });

  it("otherwise the remembered view, then the preference, then All", () => {
    expect(resolveView({ stored: "unread", preference: "all" })).toBe("unread");
    expect(resolveView({ stored: "all", preference: "unread" })).toBe("all");
    expect(resolveView({ stored: undefined, preference: "unread" })).toBe("unread");
    expect(resolveView({ stored: "nonsense", preference: undefined })).toBe("all");
    expect(resolveView({})).toBe("all");
  });
});

describe("latestDate", () => {
  it("returns the newest valid time", () => {
    expect(latestDate("2026-10-14T10:00:00Z", "2026-10-14T11:00:00Z")?.toISOString()).toBe("2026-10-14T11:00:00.000Z");
    expect(latestDate(undefined, "not a date")).toBeUndefined();
  });
});

describe("withLatestDetails", () => {
  const unreadPreview = message("unread", "2026-10-14T09:00:00Z", "users/222");
  const fromUnread = {
    item: { space: { name: "spaces/a" } },
    preview: unreadPreview,
    youReplied: false,
    latestTime: "2026-10-14T09:00:00Z",
    names: { "users/222": "Ann" },
    fromUnread: true,
  };

  it("keeps You replied and the newest preview from someone else once the latest messages load", () => {
    const newerReply = message("thread-reply", "2026-10-14T10:00:00Z", "users/333");
    const row = withLatestDetails(fromUnread, {
      preview: newerReply,
      youReplied: true,
      latestTime: "2026-10-14T11:00:00Z",
      names: { "users/333": "Bo" },
    });
    expect(row.preview?.name).toBe("thread-reply");
    expect(row.names).toEqual({ "users/333": "Bo" });
    expect(row.youReplied).toBe(true);
    expect(row.latestTime).toBe("2026-10-14T11:00:00Z");
    expect(row.item).toBe(fromUnread.item);
  });

  it("keeps the unread preview when the latest messages hold none from someone else, or an older one", () => {
    expect(withLatestDetails(fromUnread, { youReplied: true, names: {} })).toMatchObject({
      preview: unreadPreview,
      names: { "users/222": "Ann" },
      youReplied: true,
      latestTime: "2026-10-14T09:00:00Z",
    });
    const older = message("older", "2026-10-14T08:00:00Z", "users/333");
    const row = withLatestDetails(fromUnread, {
      preview: older,
      youReplied: false,
      latestTime: "2026-10-14T08:00:00Z",
      names: { "users/333": "Bo" },
    });
    expect(row.preview?.name).toBe("unread");
    expect(row.names).toEqual({ "users/222": "Ann" });
    expect(row.latestTime).toBe("2026-10-14T09:00:00Z");
  });

  it("carries You replied from the Unread section before the latest messages load", () => {
    expect(withLatestDetails(fromUnread, { youReplied: true })).toMatchObject({
      preview: unreadPreview,
      youReplied: true,
      names: { "users/222": "Ann" },
    });
  });
});
