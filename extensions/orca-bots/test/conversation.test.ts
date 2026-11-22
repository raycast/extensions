import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  type Conversation,
  isAnswered,
  latestError,
  latestReply,
  mergeFragments,
  parseConversation,
} from "../src/lib/conversation";

const loadResult = (name: string): unknown =>
  JSON.parse(readFileSync(join(__dirname, "fixtures", name), "utf8")).result;

describe("parseConversation", () => {
  test("missing state is never done", () => {
    const conv = parseConversation(loadResult("agent-read-no-state.json"));
    expect(conv.state).toBe("unknown");
    expect(latestReply(conv)).toBeNull();
    expect(isAnswered(conv)).toBe(false);
  });

  test("done conversation exposes the reply", () => {
    const conv = parseConversation(loadResult("agent-read-done.json"));
    expect(conv.state).toBe("done");
    expect(isAnswered(conv)).toBe(true);
    expect(latestReply(conv)).toBe("pong");
  });

  test("working state is kept and is never answered", () => {
    const conv = parseConversation({
      state: "working",
      entries: [
        { kind: "message", role: "user", text: "q" },
        { kind: "message", role: "assistant", text: "partial" },
      ],
    });
    expect(conv.state).toBe("working");
    expect(isAnswered(conv)).toBe(false);
  });

  test("unknown state values fall back to unknown", () => {
    for (const state of ["blocked", "waiting", "future-state", 3, null]) {
      expect(parseConversation({ state, entries: [] }).state).toBe("unknown");
    }
  });

  test("keeps only non-empty message entries", () => {
    const conv = parseConversation({
      state: "done",
      entries: [
        { kind: "message", role: "user", text: "q" },
        { kind: "tool_call", role: "assistant", text: "ls" },
        { kind: "message", role: "assistant", text: "" },
        { kind: "message", role: "assistant" },
        { kind: "message", role: "assistant", text: "answer" },
        null,
        42,
      ],
    });
    expect(conv.entries).toEqual([
      { role: "user", text: "q" },
      { role: "assistant", text: "answer" },
    ]);
  });

  test("tolerates unexpected shapes", () => {
    for (const value of [null, undefined, 42, "x", {}, { entries: "nope" }]) {
      expect(parseConversation(value)).toEqual({ state: "unknown", entries: [], limited: false });
    }
  });

  // Fixture synthétique (non capturée) : le formateur de la CLI (agents/agent-conversations.js, formatEntry)
  // émet `{ kind: "error", text }` ; le champ `message` n'y est qu'un repli défensif.
  test("keeps error entries with the error role, using text then message", () => {
    const conv = parseConversation({
      state: "done",
      entries: [
        { kind: "message", role: "user", text: "q" },
        { kind: "error", text: "rate limited" },
        { kind: "error", message: "boom" },
        { kind: "error" },
        { kind: "tool", text: "ls" },
      ],
    });
    expect(conv.entries).toEqual([
      { role: "user", text: "q" },
      { role: "error", text: "rate limited" },
      { role: "error", text: "boom" },
      { role: "error", text: "Error without details." },
    ]);
  });
});

describe("latestError", () => {
  test("returns the error text when the last entry after the user message is an error", () => {
    const conv: Conversation = {
      state: "done",
      limited: false,
      entries: [
        { role: "user", text: "q" },
        { role: "error", text: "rate limited" },
      ],
    };
    expect(latestError(conv)).toBe("rate limited");
    expect(isAnswered(conv)).toBe(false);
  });

  test("an error followed by a reply is not the outcome", () => {
    const conv: Conversation = {
      state: "done",
      limited: false,
      entries: [
        { role: "user", text: "q" },
        { role: "error", text: "transient" },
        { role: "assistant", text: "answer" },
      ],
    };
    expect(latestError(conv)).toBeNull();
    expect(isAnswered(conv)).toBe(true);
  });

  test("a reply followed by an error is not a clean answer", () => {
    const conv: Conversation = {
      state: "done",
      limited: false,
      entries: [
        { role: "user", text: "q" },
        { role: "assistant", text: "partial" },
        { role: "error", text: "crashed" },
      ],
    };
    expect(latestError(conv)).toBe("crashed");
    expect(isAnswered(conv)).toBe(false);
  });

  test("an error before the last user message is ignored", () => {
    const conv: Conversation = {
      state: "working",
      limited: false,
      entries: [
        { role: "user", text: "first" },
        { role: "error", text: "old" },
        { role: "user", text: "second" },
      ],
    };
    expect(latestError(conv)).toBeNull();
  });
});

describe("latestReply", () => {
  test("reply before the last user message is not the answer", () => {
    const conv: Conversation = {
      state: "done",
      limited: false,
      entries: [
        { role: "user", text: "first" },
        { role: "assistant", text: "old" },
        { role: "user", text: "second" },
      ],
    };
    expect(latestReply(conv)).toBeNull();
    expect(isAnswered(conv)).toBe(false);
  });

  test("returns the last assistant entry after the last user entry", () => {
    const conv: Conversation = {
      state: "done",
      limited: false,
      entries: [
        { role: "user", text: "first" },
        { role: "assistant", text: "old" },
        { role: "user", text: "second" },
        { role: "assistant", text: "mid" },
        { role: "assistant", text: "final" },
      ],
    };
    expect(latestReply(conv)).toBe("final");
  });

  test("a done state without any assistant entry is not answered", () => {
    const conv: Conversation = { state: "done", entries: [{ role: "user", text: "q" }], limited: false };
    expect(isAnswered(conv)).toBe(false);
  });
});

describe("limited flag", () => {
  test("parseConversation exposes limited from the CLI response", () => {
    expect(parseConversation({ state: "done", entries: [], limited: true }).limited).toBe(true);
    expect(parseConversation({ state: "done", entries: [], limited: false }).limited).toBe(false);
    expect(parseConversation({ state: "done", entries: [] }).limited).toBe(false);
    expect(parseConversation(loadResult("agent-read-done.json")).limited).toBe(false);
  });
});

describe("mergeFragments", () => {
  test("merges consecutive entries of the same role under one block", () => {
    const merged = mergeFragments([
      { role: "user", text: "q" },
      { role: "assistant", text: "part one" },
      { role: "assistant", text: "part two" },
      { role: "error", text: "boom" },
      { role: "assistant", text: "retry" },
    ]);
    expect(merged).toEqual([
      { role: "user", text: "q" },
      { role: "assistant", text: "part one\n\npart two" },
      { role: "error", text: "boom" },
      { role: "assistant", text: "retry" },
    ]);
  });

  test("keeps consecutive errors as separate entries", () => {
    expect(
      mergeFragments([
        { role: "error", text: "first" },
        { role: "error", text: "second" },
      ]),
    ).toHaveLength(2);
  });

  test("does not mutate its input and handles an empty list", () => {
    const input = [
      { role: "assistant", text: "a" },
      { role: "assistant", text: "b" },
    ];
    mergeFragments(input);
    expect(input).toEqual([
      { role: "assistant", text: "a" },
      { role: "assistant", text: "b" },
    ]);
    expect(mergeFragments([])).toEqual([]);
  });
});
