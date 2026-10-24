import { describe, expect, it } from "vitest";

import type { Message } from "../src/api/types";
import {
  buildThreadOptions,
  decodeThreadChoice,
  encodeThreadChoice,
  relativeTime,
  threadLabel,
  threadMode,
} from "../src/helpers/threads";

const NOW = Date.parse("2026-10-14T12:00:00Z");

function message(id: string, thread: string, createTime: string, extra: Partial<Message> = {}): Message {
  return {
    name: `spaces/A/messages/${id}`,
    thread: { name: `spaces/A/threads/${thread}` },
    createTime,
    sender: { name: "users/1", displayName: "Sara Khan" },
    text: `message ${id}`,
    ...extra,
  };
}

describe("thread choices", () => {
  it("round-trips new, paste and thread values", () => {
    for (const choice of [
      { kind: "new" } as const,
      { kind: "paste" } as const,
      { kind: "thread", name: "spaces/A/threads/T" } as const,
    ]) {
      expect(decodeThreadChoice(encodeThreadChoice(choice))).toEqual(choice);
    }
    expect(encodeThreadChoice({ kind: "thread", name: "spaces/A/threads/T" })).toBe("thread:spaces/A/threads/T");
  });

  it("reads old drafts that stored the link itself, and treats garbage as a new message", () => {
    expect(decodeThreadChoice("https://chat.google.com/room/A/T/M")).toEqual({
      kind: "thread",
      name: "spaces/A/threads/T",
    });
    expect(decodeThreadChoice("not a thread")).toEqual({ kind: "new" });
    expect(decodeThreadChoice(undefined)).toEqual({ kind: "new" });
    expect(decodeThreadChoice("thread:garbage")).toEqual({ kind: "new" });
  });
});

describe("threadMode", () => {
  it("lists all threads in named spaces, only replied threads in DMs and group chats, none when unthreaded", () => {
    expect(threadMode({ spaceType: "SPACE", spaceThreadingState: "THREADED_MESSAGES" })).toBe("all");
    expect(threadMode({ spaceType: "DIRECT_MESSAGE" })).toBe("withReplies");
    expect(threadMode({ spaceType: "GROUP_CHAT" })).toBe("withReplies");
    expect(threadMode({ spaceType: "GROUP_CHAT", spaceThreadingState: "UNTHREADED_MESSAGES" })).toBe("none");
  });
});

describe("relativeTime", () => {
  it("formats recent times compactly", () => {
    expect(relativeTime("2026-10-14T11:59:40Z", NOW)).toBe("just now");
    expect(relativeTime("2026-10-14T11:55:00Z", NOW)).toBe("5m ago");
    expect(relativeTime("2026-10-14T09:00:00Z", NOW)).toBe("3h ago");
    expect(relativeTime("2026-10-12T12:00:00Z", NOW)).toBe("2d ago");
    expect(relativeTime("2026-09-23T12:00:00Z", NOW)).toBe("3w ago");
    expect(relativeTime("2026-06-01T12:00:00Z", NOW)).toBe("2026-06-01");
    expect(relativeTime(undefined, NOW)).toBe("");
  });
});

describe("threadLabel", () => {
  it("uses ~60 characters of plain text, the sender and the time", () => {
    const latest = message("1", "T", "2026-10-14T10:00:00Z", {
      text: `*Can* you review <users/2>'s PR? ${"x".repeat(80)}`,
    });
    const label = threadLabel(latest, { "users/2": "Ali Raza" }, NOW);
    expect(label.startsWith("Can you review @Ali Raza's PR? x")).toBe(true);
    expect(label).toContain("… — Sara Khan · 2h ago");
    expect(label.split(" — ")[0]).toHaveLength(60);
  });
});

describe("buildThreadOptions", () => {
  const messages = [
    message("T1", "T1", "2026-10-14T08:00:00Z"),
    message("T1.r1", "T1", "2026-10-14T11:00:00Z", { threadReply: true, text: "latest in T1" }),
    message("T2", "T2", "2026-10-14T10:00:00Z", { text: "only message in T2" }),
    message("T3", "T3", "2026-10-13T10:00:00Z"),
    message("none", "", "2026-10-14T11:30:00Z", { thread: undefined }),
  ];

  it("keeps one option per thread, labelled with its latest message, newest thread first", () => {
    const options = buildThreadOptions(messages, { mode: "all", now: NOW });
    expect(options.map((o) => o.name)).toEqual(["spaces/A/threads/T1", "spaces/A/threads/T2", "spaces/A/threads/T3"]);
    expect(options[0].value).toBe("thread:spaces/A/threads/T1");
    expect(options[0].title).toBe("latest in T1 — Sara Khan · 1h ago");
    expect(options[0].latestTime).toBe("2026-10-14T11:00:00Z");
  });

  it("only offers threads with replies in DMs and group chats", () => {
    expect(buildThreadOptions(messages, { mode: "withReplies", now: NOW }).map((o) => o.name)).toEqual([
      "spaces/A/threads/T1",
    ]);
    expect(buildThreadOptions(messages.slice(2), { mode: "withReplies", now: NOW })).toEqual([]);
    expect(buildThreadOptions(messages, { mode: "none", now: NOW })).toEqual([]);
  });

  it("limits the number of threads", () => {
    const many = Array.from({ length: 30 }, (_, i) =>
      message(`M${i}`, `T${i}`, new Date(NOW - i * 60_000).toISOString()),
    );
    const options = buildThreadOptions(many, { mode: "all", now: NOW });
    expect(options).toHaveLength(20);
    expect(options[0].name).toBe("spaces/A/threads/T0");
  });
});
