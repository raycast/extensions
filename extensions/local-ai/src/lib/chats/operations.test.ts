import { describe, expect, it } from "vitest";
import { appendMessage, createChat, NEW_CHAT_TITLE, renameChat, titleFromMessage, toTurns } from "./operations";
import type { ChatMessage } from "./types";

const NOW = "2026-01-01T00:00:00.000Z";

function message(id: string, role: ChatMessage["role"], content: string): ChatMessage {
  return { id, role, content, createdAt: NOW };
}

describe("titleFromMessage", () => {
  it("uses the first non-blank line, trimmed", () => {
    expect(titleFromMessage("  hello\n world  ")).toBe("hello");
  });

  it("cuts a long first line to 40 characters ending in an ellipsis", () => {
    const title = titleFromMessage("a".repeat(60));
    expect(title).toHaveLength(40);
    expect(title.endsWith("…")).toBe(true);
  });

  it("falls back for a blank message", () => {
    expect(titleFromMessage(" \n ")).toBe(NEW_CHAT_TITLE);
  });
});

describe("chat operations", () => {
  const empty = createChat({ id: "c1", now: NOW });

  it("sets the title from the first user message only once", () => {
    const first = appendMessage(empty, message("m1", "user", "First question"), NOW);
    const second = appendMessage(first, message("m2", "user", "Second question"), NOW);
    expect(first.title).toBe("First question");
    expect(second.title).toBe("First question");
  });

  it("keeps the old title when renaming to blank", () => {
    expect(renameChat({ ...empty, title: "Keep" }, "  ", NOW).title).toBe("Keep");
    expect(renameChat(empty, "  New  ", NOW).title).toBe("New");
  });

  it("pairs user and assistant messages in order", () => {
    const turns = toTurns([message("1", "user", "Q1"), message("2", "assistant", "A1"), message("3", "user", "Q2")]);
    expect(turns.map((t) => [t.user.content, t.assistant?.content])).toEqual([
      ["Q1", "A1"],
      ["Q2", undefined],
    ]);
  });

  it("creates a seeded chat with two messages and a title from the seed", () => {
    const chat = createChat({ id: "c2", now: NOW }, { seed: { userMessage: "Why?", assistantMessage: "Because." } });
    expect(chat.title).toBe("Why?");
    expect(chat.messages.map((m) => [m.role, m.content])).toEqual([
      ["user", "Why?"],
      ["assistant", "Because."],
    ]);
  });

  it("prefers an explicit seed title over the first line of the message", () => {
    const chat = createChat(
      { id: "c3", now: NOW },
      { seed: { userMessage: "Context:\nsome text", assistantMessage: "Because.", title: "Why is the sky blue?" } },
    );
    expect(chat.title).toBe("Why is the sky blue?");
  });
});
