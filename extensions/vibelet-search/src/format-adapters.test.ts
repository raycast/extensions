import { describe, expect, it } from "vitest";
import { claudeAdapter, codexAdapter, cleanTitle, getAdapter, isMeaningfulUserMessage } from "./format-adapters";

describe("isMeaningfulUserMessage", () => {
  it("rejects only empty / whitespace-only input (short replies are still real)", () => {
    expect(isMeaningfulUserMessage("")).toBe(false);
    expect(isMeaningfulUserMessage("  ")).toBe(false);
    // Short replies are real user content — should be kept
    expect(isMeaningfulUserMessage("ok")).toBe(true);
    expect(isMeaningfulUserMessage("要")).toBe(true);
  });

  it("rejects AGENTS.md / CLAUDE.md system prompts", () => {
    expect(isMeaningfulUserMessage("# AGENTS.md instructions for /Users/me/repo")).toBe(false);
    expect(isMeaningfulUserMessage("# CLAUDE.md")).toBe(false);
    expect(isMeaningfulUserMessage("#AGENTS.md")).toBe(false);
    expect(isMeaningfulUserMessage("#  agents.md")).toBe(false);
  });

  it("rejects wrapped system context tags", () => {
    expect(isMeaningfulUserMessage("<system-reminder>do not lie</system-reminder>")).toBe(false);
    expect(isMeaningfulUserMessage("<environment_context>cwd=/foo</environment_context>")).toBe(false);
    expect(isMeaningfulUserMessage("<command-message>commit</command-message>")).toBe(false);
    expect(isMeaningfulUserMessage("<command-name>/commit</command-name>")).toBe(false);
    expect(isMeaningfulUserMessage("<command-args>arg1</command-args>")).toBe(false);
  });

  it("rejects Caveat: prefixes", () => {
    expect(isMeaningfulUserMessage("Caveat: this conversation was resumed")).toBe(false);
  });

  it("rejects auto-injected event wrappers", () => {
    expect(isMeaningfulUserMessage("<task-notification>done</task-notification>")).toBe(false);
    expect(isMeaningfulUserMessage("<local-command-stdout>ok</local-command-stdout>")).toBe(false);
    expect(isMeaningfulUserMessage("<local-command-stderr>nope</local-command-stderr>")).toBe(false);
    expect(isMeaningfulUserMessage("<user-prompt-submit-hook>x</user-prompt-submit-hook>")).toBe(false);
    expect(isMeaningfulUserMessage("<bash-input>ls</bash-input>")).toBe(false);
    expect(isMeaningfulUserMessage("<bash-stdout>file.txt</bash-stdout>")).toBe(false);
  });

  it("rejects interrupted-by-user markers", () => {
    expect(isMeaningfulUserMessage("[Request interrupted by user for tool use]")).toBe(false);
    expect(isMeaningfulUserMessage("[Request interrupted by user]")).toBe(false);
  });

  it("rejects lone image-only messages", () => {
    expect(isMeaningfulUserMessage("[Image: source: /tmp/foo.png]")).toBe(false);
  });

  it("accepts real user messages", () => {
    expect(isMeaningfulUserMessage("帮我修复这个 bug")).toBe(true);
    expect(isMeaningfulUserMessage("How do I write a Vue component?")).toBe(true);
    expect(isMeaningfulUserMessage("create a new feature")).toBe(true);
  });

  it("accepts user messages that mention AGENTS.md but don't START with the heading", () => {
    expect(isMeaningfulUserMessage("Update AGENTS.md to include the new rule")).toBe(true);
  });

  it("accepts user messages with leading angle brackets that aren't system tags", () => {
    expect(isMeaningfulUserMessage("<div> what does this html mean?")).toBe(true);
  });
});

describe("cleanTitle", () => {
  it("trims whitespace and takes the first non-empty line", () => {
    expect(cleanTitle("\n\n  hello world  \nsecond line\n")).toBe("hello world");
  });

  it("handles CRLF line endings", () => {
    expect(cleanTitle("first line\r\nsecond")).toBe("first line");
  });

  it("strips leading wrapper tags", () => {
    expect(cleanTitle("<website>https://example.com</website> what is this?")).toBe(
      "https://example.com</website> what is this?",
    );
  });

  it("truncates to 120 chars", () => {
    const longText = "x".repeat(200);
    expect(cleanTitle(longText)).toHaveLength(120);
  });

  it("returns empty string for empty input", () => {
    expect(cleanTitle("")).toBe("");
    expect(cleanTitle("   ")).toBe("");
  });
});

describe("claudeAdapter.parseLine", () => {
  it("parses a user message with string content", () => {
    const raw = {
      type: "user",
      timestamp: "2026-04-10T10:00:00.000Z",
      message: { role: "user", content: "Hello" },
    };
    expect(claudeAdapter.parseLine(raw)).toEqual({
      role: "user",
      content: "Hello",
      timestamp: "2026-04-10T10:00:00.000Z",
    });
  });

  it("parses a user message with content blocks", () => {
    const raw = {
      type: "user",
      timestamp: "2026-04-10T10:00:00.000Z",
      message: {
        role: "user",
        content: [
          { type: "text", text: "Hello" },
          { type: "text", text: "World" },
        ],
      },
    };
    expect(claudeAdapter.parseLine(raw)?.content).toBe("Hello\nWorld");
  });

  it("parses an assistant message", () => {
    const raw = {
      type: "assistant",
      timestamp: "2026-04-10T10:00:00.000Z",
      message: { role: "assistant", content: "Sure, here's the answer" },
    };
    expect(claudeAdapter.parseLine(raw)?.role).toBe("assistant");
  });

  it("skips tool_use and tool_result blocks but keeps text", () => {
    const raw = {
      type: "assistant",
      timestamp: "2026-04-10T10:00:00.000Z",
      message: {
        role: "assistant",
        content: [
          { type: "text", text: "Let me check" },
          { type: "tool_use", id: "abc", name: "Read", input: {} },
          { type: "text", text: "Done" },
        ],
      },
    };
    expect(claudeAdapter.parseLine(raw)?.content).toBe("Let me check\nDone");
  });

  it("returns null for non-message line types", () => {
    expect(claudeAdapter.parseLine({ type: "queue-operation" })).toBeNull();
    expect(claudeAdapter.parseLine({ type: "last-prompt" })).toBeNull();
    expect(claudeAdapter.parseLine({ type: "attachment" })).toBeNull();
  });

  it("returns null when content is missing or empty", () => {
    expect(claudeAdapter.parseLine({ type: "user", message: { role: "user" } })).toBeNull();
    expect(claudeAdapter.parseLine({ type: "user", message: { role: "user", content: "" } })).toBeNull();
    expect(claudeAdapter.parseLine({ type: "user", message: { role: "user", content: [] } })).toBeNull();
  });

  it("returns null for completely malformed input", () => {
    expect(claudeAdapter.parseLine(null)).toBeNull();
    expect(claudeAdapter.parseLine({})).toBeNull();
    expect(claudeAdapter.parseLine("not an object")).toBeNull();
  });
});

describe("codexAdapter.parseLine", () => {
  it("parses a new-format user message (response_item / message)", () => {
    const raw = {
      type: "response_item",
      timestamp: "2026-04-10T10:00:00.000Z",
      payload: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: "Hello Codex" }],
      },
    };
    expect(codexAdapter.parseLine(raw)).toEqual({
      role: "user",
      content: "Hello Codex",
      timestamp: "2026-04-10T10:00:00.000Z",
    });
  });

  it("parses a new-format assistant message", () => {
    const raw = {
      type: "response_item",
      timestamp: "2026-04-10T10:00:01.000Z",
      payload: {
        type: "message",
        role: "assistant",
        content: [{ type: "output_text", text: "Sure" }],
      },
    };
    expect(codexAdapter.parseLine(raw)?.role).toBe("assistant");
    expect(codexAdapter.parseLine(raw)?.content).toBe("Sure");
  });

  it("parses an old-format message (no payload wrapper)", () => {
    const raw = {
      type: "message",
      role: "user",
      content: [{ type: "input_text", text: "Old format hello" }],
    };
    expect(codexAdapter.parseLine(raw)).toEqual({
      role: "user",
      content: "Old format hello",
      timestamp: "",
    });
  });

  it("skips input_image blocks but keeps text", () => {
    const raw = {
      type: "response_item",
      timestamp: "2026-04-10T10:00:00.000Z",
      payload: {
        type: "message",
        role: "user",
        content: [
          { type: "input_text", text: "Look at this:" },
          { type: "input_image", image_url: "data:image/png;base64,abc" },
        ],
      },
    };
    expect(codexAdapter.parseLine(raw)?.content).toBe("Look at this:");
  });

  it("returns null for non-message response_items", () => {
    expect(codexAdapter.parseLine({ type: "response_item", payload: { type: "function_call" } })).toBeNull();
    expect(codexAdapter.parseLine({ type: "session_meta", payload: { id: "abc" } })).toBeNull();
    expect(codexAdapter.parseLine({ type: "event_msg" })).toBeNull();
    expect(codexAdapter.parseLine({ type: "turn_context" })).toBeNull();
  });

  it("returns null for developer/system role messages (Codex protocol noise)", () => {
    expect(
      codexAdapter.parseLine({
        type: "response_item",
        payload: {
          type: "message",
          role: "developer",
          content: [{ type: "input_text", text: "<permissions instructions> ..." }],
        },
      }),
    ).toBeNull();
    expect(
      codexAdapter.parseLine({
        type: "response_item",
        payload: {
          type: "message",
          role: "system",
          content: [{ type: "input_text", text: "system stuff" }],
        },
      }),
    ).toBeNull();
  });

  it("returns null when content is missing", () => {
    expect(
      codexAdapter.parseLine({
        type: "response_item",
        payload: { type: "message", role: "user", content: [] },
      }),
    ).toBeNull();
  });
});

describe("getAdapter", () => {
  it("returns claudeAdapter for claude-cli and claude-app sources", () => {
    expect(getAdapter("claude-cli")).toBe(claudeAdapter);
    expect(getAdapter("claude-app")).toBe(claudeAdapter);
  });

  it("returns codexAdapter for codex-cli and codex-app sources", () => {
    expect(getAdapter("codex-cli")).toBe(codexAdapter);
    expect(getAdapter("codex-app")).toBe(codexAdapter);
  });

  it("accepts a format string directly", () => {
    expect(getAdapter("claude")).toBe(claudeAdapter);
    expect(getAdapter("codex")).toBe(codexAdapter);
  });
});
