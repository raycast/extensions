import { describe, expect, it, vi } from "vitest";

// @raycast/api's published dist/index.js only exports the CLI bootstrap
// (`run`), not runtime enums like `Color` — that's only defined in the type
// declarations, injected for real at extension runtime. Mirror the pattern
// already used in tests/storage.test.ts and tests/lmstudio.test.ts: mock the
// module with the real string values from node_modules/@raycast/api/types/index.d.ts.
vi.mock("@raycast/api", () => ({
  Color: {
    Blue: "raycast-blue",
    Green: "raycast-green",
    Magenta: "raycast-magenta",
    Orange: "raycast-orange",
    Purple: "raycast-purple",
    Red: "raycast-red",
    Yellow: "raycast-yellow",
  },
}));

import {
  answerText,
  hasAttachments,
  modelColor,
  shortModelName,
  splitIntoTurns,
  turnMarkdown,
} from "../src/lib/transcript";
import { Chat, Message } from "../src/lib/types";

function msg(role: "user" | "assistant", content: string): Message {
  return { role, content, timestamp: 0 };
}

function chat(messages: Message[]): Chat {
  return {
    id: "c1",
    title: "t",
    model: "google/gemma-4-e4b",
    messages,
    createdAt: 0,
    updatedAt: 0,
  };
}

describe("splitIntoTurns", () => {
  it("pairs each user message with the following assistant message", () => {
    const turns = splitIntoTurns(
      chat([msg("user", "q1"), msg("assistant", "a1"), msg("user", "q2"), msg("assistant", "a2")]),
    );
    expect(turns).toHaveLength(2);
    expect(turns[0]).toMatchObject({ userIndex: 0 });
    expect(turns[0].question.content).toBe("q1");
    expect(turns[0].answer?.content).toBe("a1");
    expect(turns[1].userIndex).toBe(2);
    expect(turns[1].answer?.content).toBe("a2");
  });

  it("handles a trailing user message with no answer yet", () => {
    const turns = splitIntoTurns(chat([msg("user", "q1")]));
    expect(turns).toHaveLength(1);
    expect(turns[0].answer).toBeUndefined();
  });

  it("returns [] for an empty chat", () => {
    expect(splitIntoTurns(chat([]))).toEqual([]);
  });
});

describe("answerText", () => {
  it("returns the answer content or empty string", () => {
    const [t] = splitIntoTurns(chat([msg("user", "q"), msg("assistant", "a")]));
    expect(answerText(t)).toBe("a");
    const [t2] = splitIntoTurns(chat([msg("user", "q")]));
    expect(answerText(t2)).toBe("");
  });
});

describe("turnMarkdown", () => {
  it("renders the You / model / answer block", () => {
    const [t] = splitIntoTurns(chat([msg("user", "hi"), msg("assistant", "hello")]));
    const md = turnMarkdown(t, "google/gemma-4-e4b");
    expect(md).toContain("**🧑 You**");
    expect(md).toContain("hi");
    expect(md).toContain("**🤖 google/gemma-4-e4b**");
    expect(md).toContain("hello");
    expect(md).toContain("---");
  });

  it("shows an ellipsis while the answer is empty (streaming/pending)", () => {
    const [t] = splitIntoTurns(chat([msg("user", "hi")]));
    expect(turnMarkdown(t, "m")).toContain("…");
  });
});

describe("shortModelName", () => {
  it("takes the part after the last slash", () => {
    expect(shortModelName("google/gemma-4-e4b")).toBe("gemma-4-e4b");
    expect(shortModelName("mistral")).toBe("mistral");
  });
});

describe("attachments", () => {
  it("renders image attachments as file:// markdown images", () => {
    const turn = {
      question: {
        role: "user" as const,
        content: "what is this?",
        timestamp: 0,
        attachments: [
          { type: "image" as const, path: "/tmp/my shot.png", name: "my shot.png" },
        ],
      },
      answer: { role: "assistant" as const, content: "a cat", timestamp: 1 },
      userIndex: 0,
    };
    const md = turnMarkdown(turn, "m");
    expect(md).toContain("![my shot.png](file:///tmp/my%20shot.png)");
    expect(md.indexOf("![my shot.png]")).toBeLessThan(md.indexOf("---"));
  });

  it("renders text attachments as paperclip lines without content", () => {
    const turn = {
      question: {
        role: "user" as const,
        content: "summarize",
        timestamp: 0,
        attachments: [
          { type: "text" as const, path: "/x/notes.md", name: "notes.md", content: "secret" },
        ],
      },
      userIndex: 0,
    };
    const md = turnMarkdown(turn, "m");
    expect(md).toContain("📎 notes.md");
    expect(md).not.toContain("secret");
  });

  it("hasAttachments reflects question attachments", () => {
    const bare = {
      question: { role: "user" as const, content: "q", timestamp: 0 },
      userIndex: 0,
    };
    expect(hasAttachments(bare)).toBe(false);
  });
});

describe("modelColor", () => {
  it("is deterministic for the same model id", () => {
    expect(modelColor("google/gemma-4-e4b")).toBe(modelColor("google/gemma-4-e4b"));
  });

  it("returns a value from the palette", () => {
    const palette = [
      "raycast-blue",
      "raycast-green",
      "raycast-magenta",
      "raycast-orange",
      "raycast-purple",
      "raycast-red",
      "raycast-yellow",
    ];
    expect(palette).toContain(modelColor("any-model"));
  });
});
