import { describe, expect, it } from "vitest";
import { fitHistory, turnStarts } from "../src/lib/history";
import { ChatMessage } from "../src/lib/transcript";

const message = (role: ChatMessage["role"], content: string): ChatMessage => ({
  role,
  content,
  createdAt: "2026-10-08T00:00:00.000Z",
});

const history = [
  message("user", "q1"),
  message("assistant", "a1"),
  message("user", "q2"),
  message("assistant", "a2"),
  message("user", "q3"),
  message("assistant", "a3"),
];

// Pretends the new prompt costs 50 tokens and every message 100.
const measure = async (messages: ChatMessage[]) => 50 + messages.length * 100;

describe("turnStarts", () => {
  it("finds where each question starts", () => {
    expect(turnStarts(history)).toEqual([0, 2, 4]);
  });
});

describe("fitHistory", () => {
  it("keeps everything when it fits", async () => {
    const result = await fitHistory(history, 1000, measure);
    expect(result).toEqual({ history, tokens: 650, droppedMessages: 0 });
  });

  it("drops the oldest whole turns first", async () => {
    const result = await fitHistory(history, 400, measure);
    expect(result.history.map((m) => m.content)).toEqual(["q3", "a3"]);
    expect(result.droppedMessages).toBe(4);
    expect(result.tokens).toBe(250);
  });

  it("keeps as much as fits", async () => {
    const result = await fitHistory(history, 500, measure);
    expect(result.history.map((m) => m.content)).toEqual(["q2", "a2", "q3", "a3"]);
    expect(result.tokens).toBe(450);
  });

  it("drops everything when only the prompt fits, and reports the prompt's tokens", async () => {
    const result = await fitHistory(history, 100, measure);
    expect(result).toEqual({ history: [], tokens: 50, droppedMessages: 6 });
  });

  it("returns the prompt's tokens when even the prompt alone is too long", async () => {
    const result = await fitHistory(history, 10, measure);
    expect(result.history).toEqual([]);
    expect(result.tokens).toBe(50);
  });

  it("measures few times for a long chat", async () => {
    const long = Array.from({ length: 200 }, (_, i) => message(i % 2 ? "assistant" : "user", `m${i}`));
    let calls = 0;
    const result = await fitHistory(long, 1050, async (messages) => {
      calls += 1;
      return measure(messages);
    });
    expect(result.history).toHaveLength(10);
    expect(calls).toBeLessThanOrEqual(10);
  });

  it("returns an empty history for an empty chat", async () => {
    const result = await fitHistory([], 10, async () => 5);
    expect(result).toEqual({ history: [], tokens: 5, droppedMessages: 0 });
  });

  it("stops when the signal is aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(fitHistory(history, 100, measure, controller.signal)).rejects.toMatchObject({ kind: "cancelled" });
  });
});
