import { describe, expect, it } from "vitest";
import type { ChatTurn } from "./operations";
import { buildChatInstructions, buildChatStdin, DEFAULT_CHAT_INSTRUCTIONS } from "./transcript";
import type { ChatMessage } from "./types";

function message(role: ChatMessage["role"], content: string): ChatMessage {
  return { id: content, role, content, createdAt: "2026-01-01T00:00:00.000Z" };
}

describe("buildChatStdin", () => {
  it("sends only the message when there is no history", () => {
    expect(buildChatStdin([], "Hi")).toBe("Hi");
  });

  it("replays complete turns before the new message", () => {
    const history: ChatTurn[] = [{ user: message("user", "Q1"), assistant: message("assistant", "A1") }];
    expect(buildChatStdin(history, "Q2")).toBe(
      "Conversation so far:\nUser: Q1\nAssistant: A1\n\nNew message from User:\nQ2",
    );
  });

  it("writes a turn without a reply as a User line only", () => {
    const history: ChatTurn[] = [{ user: message("user", "Q1") }];
    expect(buildChatStdin(history, "Q2")).toBe("Conversation so far:\nUser: Q1\n\nNew message from User:\nQ2");
  });

  it("replays an interrupted answer without its reason or explanation", () => {
    const interrupted = {
      ...message("assistant", "Par"),
      interruptedReason: "Timed out",
      interruptedExplanation: "Too slow.",
    };
    expect(buildChatStdin([{ user: message("user", "Q1"), assistant: interrupted }], "Q2")).toBe(
      "Conversation so far:\nUser: Q1\nAssistant: Par\n\nNew message from User:\nQ2",
    );
  });

  it("marks a past message that had an image without resending it", () => {
    const history: ChatTurn[] = [
      { user: { ...message("user", "Q1"), imagePath: "/tmp/a.png" }, assistant: message("assistant", "A1") },
    ];
    expect(buildChatStdin(history, "Q2")).toBe(
      "Conversation so far:\nUser: Q1 [image attached]\nAssistant: A1\n\nNew message from User:\nQ2",
    );
  });
});

describe("buildChatInstructions", () => {
  it("wraps the default instructions with the last-message rule", () => {
    const instructions = buildChatInstructions("");
    expect(instructions.startsWith(DEFAULT_CHAT_INSTRUCTIONS)).toBe(true);
    expect(instructions.endsWith("Reply only to the last message from User.")).toBe(true);
  });

  it("uses custom instructions when given", () => {
    expect(buildChatInstructions("Be terse.")).toBe("Be terse. Reply only to the last message from User.");
  });
});
