import { describe, expect, it } from "vitest";
import {
  asBubble,
  findMatchIndex,
  formatMessageTime,
  formatRelativeTime,
  formatSessionMarkdown,
  formatSessionPlainText,
  highlightMatch,
  renderMessage,
} from "./format-session";
import type { SessionMessage, SessionMeta } from "./types";

const sampleMeta: SessionMeta = {
  id: "abc-123",
  title: "Test Session",
  source: "claude-cli",
  projectPath: "/Users/me/project",
  timestamp: new Date("2026-04-10T10:00:00.000Z").getTime(),
  filePath: "/tmp/fake.jsonl",
};

const sampleMessages: SessionMessage[] = [
  {
    role: "user",
    content: "Help me fix this bug",
    timestamp: "2026-04-10T10:00:00.000Z",
  },
  {
    role: "assistant",
    content: "Sure, what's the error?",
    timestamp: "2026-04-10T10:00:05.000Z",
  },
  {
    role: "user",
    content: "TypeError: undefined is not a function",
    timestamp: "2026-04-10T10:00:30.000Z",
  },
];

describe("findMatchIndex", () => {
  it("finds the first matching message (case-insensitive)", () => {
    expect(findMatchIndex(sampleMessages, "TypeError")).toBe(2);
    expect(findMatchIndex(sampleMessages, "typeerror")).toBe(2);
    expect(findMatchIndex(sampleMessages, "fix this bug")).toBe(0);
  });

  it("returns -1 for empty query", () => {
    expect(findMatchIndex(sampleMessages, "")).toBe(-1);
  });

  it("returns -1 when no message matches", () => {
    expect(findMatchIndex(sampleMessages, "nonexistent")).toBe(-1);
  });

  it("returns -1 for empty messages list", () => {
    expect(findMatchIndex([], "anything")).toBe(-1);
  });
});

describe("highlightMatch", () => {
  it("wraps matches in markdown bold", () => {
    expect(highlightMatch("hello world", "world")).toBe("hello **world**");
  });

  it("is case-insensitive but preserves the original casing", () => {
    expect(highlightMatch("Hello World", "world")).toBe("Hello **World**");
  });

  it("escapes regex metacharacters in the query", () => {
    expect(highlightMatch("price is $5.00", "$5.00")).toBe("price is **$5.00**");
    expect(highlightMatch("a.b.c", "a.b")).toBe("**a.b**.c");
  });

  it("highlights every occurrence", () => {
    expect(highlightMatch("foo bar foo", "foo")).toBe("**foo** bar **foo**");
  });

  it("does not highlight inside fenced code blocks", () => {
    const input = ["before foo", "```ts", "const foo = 1;", "```", "after foo"].join("\n");
    const expected = ["before **foo**", "```ts", "const foo = 1;", "```", "after **foo**"].join("\n");
    expect(highlightMatch(input, "foo")).toBe(expected);
  });

  it("returns text unchanged for empty query", () => {
    expect(highlightMatch("hello", "")).toBe("hello");
  });
});

describe("asBubble", () => {
  it("prefixes each line with > ", () => {
    expect(asBubble("line 1\nline 2")).toBe("> line 1\n> line 2");
  });

  it("preserves blank lines as > ", () => {
    expect(asBubble("a\n\nb")).toBe("> a\n> \n> b");
  });

  it("handles single line", () => {
    expect(asBubble("hello")).toBe("> hello");
  });
});

describe("formatMessageTime", () => {
  it("returns empty string for missing or invalid timestamp", () => {
    expect(formatMessageTime("")).toBe("");
    expect(formatMessageTime("not a date")).toBe("");
  });

  it("formats a valid ISO timestamp", () => {
    const result = formatMessageTime("2026-04-10T10:00:00.000Z");
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("formatRelativeTime", () => {
  it("returns 'just now' for very recent timestamps", () => {
    expect(formatRelativeTime(Date.now())).toBe("just now");
    expect(formatRelativeTime(Date.now() - 30 * 1000)).toBe("just now");
  });

  it("returns minutes for recent timestamps", () => {
    expect(formatRelativeTime(Date.now() - 5 * 60_000)).toBe("5m ago");
  });

  it("returns hours for same-day timestamps", () => {
    expect(formatRelativeTime(Date.now() - 3 * 3600_000)).toBe("3h ago");
  });

  it("returns days for recent dates", () => {
    expect(formatRelativeTime(Date.now() - 5 * 24 * 3600_000)).toBe("5d ago");
  });

  it("returns a date string for old timestamps", () => {
    const result = formatRelativeTime(Date.now() - 60 * 24 * 3600_000);
    expect(result).not.toMatch(/ago/);
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("renderMessage", () => {
  it("renders user messages as blockquote bubbles", () => {
    const out = renderMessage(sampleMessages[0]);
    expect(out).toContain("👤 You");
    expect(out).toContain("> Help me fix this bug");
  });

  it("renders assistant messages flat (no blockquote)", () => {
    const out = renderMessage(sampleMessages[1]);
    expect(out).toContain("🤖 Assistant");
    expect(out).toContain("Sure, what's the error?");
    expect(out).not.toContain(">");
  });

  it("highlights query matches when query is provided", () => {
    const out = renderMessage(sampleMessages[2], { query: "TypeError" });
    expect(out).toContain("**TypeError**");
  });

  it("truncates long content when truncate option is set", () => {
    const longMsg: SessionMessage = {
      role: "assistant",
      content: "x".repeat(5000),
      timestamp: "",
    };
    const out = renderMessage(longMsg, { truncate: 100 });
    expect(out).toContain("…(truncated)");
    expect(out.length).toBeLessThan(500);
  });

  it("includes the marker when provided", () => {
    const out = renderMessage(sampleMessages[0], { marker: "🎯" });
    expect(out).toContain("🎯");
  });
});

describe("formatSessionMarkdown", () => {
  it("includes the title, source, project path, and message count in the header", () => {
    const md = formatSessionMarkdown(sampleMeta, sampleMessages);
    expect(md).toContain("# 🟠 Test Session");
    expect(md).toContain("Claude Code");
    expect(md).toContain("/Users/me/project");
    expect(md).toContain("3 messages");
  });

  it("uses the green badge for codex sessions", () => {
    const codexMeta: SessionMeta = { ...sampleMeta, source: "codex-cli" };
    const md = formatSessionMarkdown(codexMeta, sampleMessages);
    expect(md).toContain("# 🟢");
    expect(md).toContain("Codex");
  });

  it("renders all messages in order", () => {
    const md = formatSessionMarkdown(sampleMeta, sampleMessages);
    const userIdx1 = md.indexOf("Help me fix this bug");
    const assistantIdx = md.indexOf("Sure, what's the error?");
    const userIdx2 = md.indexOf("TypeError");
    expect(userIdx1).toBeGreaterThan(0);
    expect(assistantIdx).toBeGreaterThan(userIdx1);
    expect(userIdx2).toBeGreaterThan(assistantIdx);
  });

  it("propagates the query for highlighting", () => {
    const md = formatSessionMarkdown(sampleMeta, sampleMessages, { query: "bug" });
    expect(md).toContain("**bug**");
  });
});

describe("formatSessionPlainText", () => {
  it("includes a header section with key metadata", () => {
    const txt = formatSessionPlainText(sampleMeta, sampleMessages);
    expect(txt).toContain("# Test Session");
    expect(txt).toContain("Source: Claude Code");
    expect(txt).toContain("Project: /Users/me/project");
    expect(txt).toContain("Messages: 3");
  });

  it("uses User/Assistant labels (no emoji noise) for plain text export", () => {
    const txt = formatSessionPlainText(sampleMeta, sampleMessages);
    expect(txt).toContain("## User");
    expect(txt).toContain("## Assistant");
    expect(txt).not.toContain("👤");
    expect(txt).not.toContain("🤖");
  });

  it("includes message bodies separated by ---", () => {
    const txt = formatSessionPlainText(sampleMeta, sampleMessages);
    expect(txt).toContain("Help me fix this bug");
    expect(txt).toContain("Sure, what's the error?");
    expect(txt).toContain("TypeError");
    expect(txt.split("---").length).toBeGreaterThanOrEqual(4); // header + 3 messages
  });

  it("handles empty messages list gracefully", () => {
    const txt = formatSessionPlainText(sampleMeta, []);
    expect(txt).toContain("Messages: 0");
  });
});
