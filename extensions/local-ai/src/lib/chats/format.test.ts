import { describe, expect, it } from "vitest";
import { conversationToMarkdown, conversationToText, turnToMarkdown } from "./format";
import type { ChatTurn } from "./operations";

const NOW = "2026-01-01T00:00:00.000Z";

function turn(question: string, answer?: string, imagePath?: string): ChatTurn {
  return {
    user: { id: "u", role: "user", content: question, createdAt: NOW, ...(imagePath ? { imagePath } : {}) },
    ...(answer === undefined ? {} : { assistant: { id: "a", role: "assistant", content: answer, createdAt: NOW } }),
  };
}

describe("turnToMarkdown", () => {
  it("renders the question as a blockquote above the answer", () => {
    expect(turnToMarkdown(turn("a\nb", "hi"))).toBe("**You**\n\n> a\n> b\n\n**Local AI**\n\nhi");
  });

  it("shows a thinking placeholder only while pending, otherwise a no-answer note", () => {
    expect(turnToMarkdown(turn("q"), "", true)).toContain("_Thinking..._");
    expect(turnToMarkdown(turn("q"))).toContain("_No answer._");
  });

  it("prefers the streaming text over the stored answer", () => {
    expect(turnToMarkdown(turn("q", "old"), "partial", true)).toContain("partial");
  });

  it("embeds the attached image as an encoded file URL", () => {
    expect(turnToMarkdown(turn("q", "a", "/tmp/my pic.png"))).toContain("![Attached image](file:///tmp/my%20pic.png)");
  });

  it("percent-encodes parentheses so the image link stays intact", () => {
    expect(turnToMarkdown(turn("q", "a", "/tmp/pic (1).png"))).toContain(
      "![Attached image](file:///tmp/pic%20%281%29.png)",
    );
  });
});

describe("interrupted answers", () => {
  it("renders the stored reason as an error block under the answer", () => {
    const interrupted = turn("q", "partial");
    interrupted.assistant!.interruptedReason = "Timed out";
    expect(turnToMarkdown(interrupted)).toBe("**You**\n\n> q\n\n**Local AI**\n\npartial\n\n> **Stopped: Timed out**");
  });

  it("renders the stored explanation under the reason", () => {
    const interrupted = turn("q", "partial");
    interrupted.assistant!.interruptedReason = "Timed out";
    interrupted.assistant!.interruptedExplanation = "Too slow.";
    expect(turnToMarkdown(interrupted)).toBe(
      "**You**\n\n> q\n\n**Local AI**\n\npartial\n\n> **Stopped: Timed out**\n> Too slow.",
    );
  });

  it("shows a live failure with its explanation under a question that got no answer", () => {
    const markdown = conversationToMarkdown([turn("q")], undefined, {
      userId: "u",
      title: "Timed out",
      explanation: "Too slow.",
    });
    expect(markdown.endsWith("_No answer._\n\n> **Stopped: Timed out**\n> Too slow.")).toBe(true);
  });
});

describe("conversationToText", () => {
  it("joins turns oldest first in the You and Local AI format", () => {
    expect(conversationToText([turn("q1", "a1"), turn("q2")])).toBe(
      "**You**\n\nq1\n\n**Local AI**\n\na1\n\n---\n\n**You**\n\nq2\n\n**Local AI**\n\n_No answer._",
    );
  });
});

describe("conversationToMarkdown", () => {
  const first = turn("q1", "a1");
  const second: ChatTurn = { user: { ...turn("q2").user, id: "u2" } };

  it("separates turns oldest first with a horizontal rule", () => {
    expect(conversationToMarkdown([first, turn("q2", "a2")])).toBe(
      `${turnToMarkdown(first)}\n\n---\n\n${turnToMarkdown(turn("q2", "a2"))}`,
    );
  });

  it("renders the streaming answer live on the matching turn only", () => {
    const markdown = conversationToMarkdown([first, second], { userId: "u2", text: "partial" });
    expect(markdown).toContain("a1");
    expect(markdown.endsWith("**Local AI**\n\npartial")).toBe(true);
  });

  it("shows the thinking placeholder while the streamed text is still empty", () => {
    expect(conversationToMarkdown([second], { userId: "u2", text: "" })).toContain("_Thinking..._");
  });

  it("returns an empty string for no turns", () => {
    expect(conversationToMarkdown([])).toBe("");
  });
});
