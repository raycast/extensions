import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { loadSessionMessages, parseCodexSessionMetaLine } from "./parsers";
import type { CodexConversationLine, SessionMeta } from "./types";

describe("parseCodexSessionMetaLine", () => {
  it("parses new format session_meta lines", () => {
    const line: CodexConversationLine = {
      type: "session_meta",
      timestamp: "2026-04-10T10:00:00.000Z",
      payload: {
        id: "019d-7-abc",
        cwd: "/Users/me/project",
      },
    };
    expect(parseCodexSessionMetaLine(line)).toEqual({
      id: "019d-7-abc",
      projectPath: "/Users/me/project",
      ts: new Date("2026-04-10T10:00:00.000Z").getTime(),
    });
  });

  it("parses old format session lines (no `type` field)", () => {
    const line: CodexConversationLine = {
      id: "old-style-id",
      timestamp: "2025-09-01T08:00:00.000Z",
      instructions: "you are a helpful assistant",
      git: { cwd: "/Users/me/old-project" },
    };
    expect(parseCodexSessionMetaLine(line)).toEqual({
      id: "old-style-id",
      projectPath: "/Users/me/old-project",
      ts: new Date("2025-09-01T08:00:00.000Z").getTime(),
    });
  });

  it("returns null when neither format matches", () => {
    expect(parseCodexSessionMetaLine({ type: "response_item" } as CodexConversationLine)).toBeNull();
    expect(parseCodexSessionMetaLine({} as CodexConversationLine)).toBeNull();
  });

  it("returns null when payload.id is missing in new format", () => {
    expect(
      parseCodexSessionMetaLine({
        type: "session_meta",
        timestamp: "2026-04-10T10:00:00.000Z",
        payload: { cwd: "/foo" },
      }),
    ).toBeNull();
  });

  it("handles missing cwd gracefully (empty string)", () => {
    const line: CodexConversationLine = {
      type: "session_meta",
      timestamp: "2026-04-10T10:00:00.000Z",
      payload: { id: "abc" },
    };
    expect(parseCodexSessionMetaLine(line)?.projectPath).toBe("");
  });
});

describe("loadSessionMessages", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "vibelet-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function writeFile(name: string, lines: string[]): string {
    const file = path.join(tmpDir, name);
    fs.writeFileSync(file, lines.join("\n") + "\n");
    return file;
  }

  it("loads Claude Code messages with string content", () => {
    const filePath = writeFile("claude.jsonl", [
      JSON.stringify({ type: "user", timestamp: "2026-04-10T10:00:00Z", message: { role: "user", content: "Hello" } }),
      JSON.stringify({
        type: "assistant",
        timestamp: "2026-04-10T10:00:01Z",
        message: { role: "assistant", content: "Hi back" },
      }),
    ]);

    const meta: SessionMeta = {
      id: "test",
      title: "t",
      source: "claude-cli",
      projectPath: "/tmp",
      timestamp: 0,
      filePath,
    };

    const messages = loadSessionMessages(meta);
    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({ role: "user", content: "Hello" });
    expect(messages[1]).toMatchObject({ role: "assistant", content: "Hi back" });
  });

  it("loads Claude Code messages with content blocks, skipping tool_use", () => {
    const filePath = writeFile("claude-blocks.jsonl", [
      JSON.stringify({
        type: "assistant",
        timestamp: "2026-04-10T10:00:00Z",
        message: {
          role: "assistant",
          content: [
            { type: "text", text: "Let me read the file" },
            { type: "tool_use", id: "abc", name: "Read", input: {} },
            { type: "text", text: "Done reading" },
          ],
        },
      }),
    ]);

    const meta: SessionMeta = {
      id: "test",
      title: "t",
      source: "claude-cli",
      projectPath: "/tmp",
      timestamp: 0,
      filePath,
    };

    const messages = loadSessionMessages(meta);
    expect(messages).toHaveLength(1);
    expect(messages[0].content).toBe("Let me read the file\nDone reading");
  });

  it("loads Codex new-format messages", () => {
    const filePath = writeFile("codex-new.jsonl", [
      JSON.stringify({
        type: "session_meta",
        timestamp: "2026-04-10T10:00:00Z",
        payload: { id: "abc", cwd: "/tmp" },
      }),
      JSON.stringify({
        type: "response_item",
        timestamp: "2026-04-10T10:00:01Z",
        payload: {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: "Hi Codex" }],
        },
      }),
      JSON.stringify({
        type: "response_item",
        timestamp: "2026-04-10T10:00:02Z",
        payload: {
          type: "message",
          role: "assistant",
          content: [{ type: "output_text", text: "Hello!" }],
        },
      }),
    ]);

    const meta: SessionMeta = {
      id: "abc",
      title: "t",
      source: "codex-cli",
      projectPath: "/tmp",
      timestamp: 0,
      filePath,
    };

    const messages = loadSessionMessages(meta);
    expect(messages).toHaveLength(2); // session_meta is skipped
    expect(messages[0]).toMatchObject({ role: "user", content: "Hi Codex" });
    expect(messages[1]).toMatchObject({ role: "assistant", content: "Hello!" });
  });

  it("loads Codex old-format messages", () => {
    const filePath = writeFile("codex-old.jsonl", [
      JSON.stringify({ id: "old-1", timestamp: "2025-09-01T08:00:00Z", instructions: "..." }),
      JSON.stringify({ type: "message", role: "user", content: [{ type: "input_text", text: "Old hello" }] }),
      JSON.stringify({
        type: "message",
        role: "assistant",
        content: [{ type: "output_text", text: "Old reply" }],
      }),
    ]);

    const meta: SessionMeta = {
      id: "old-1",
      title: "t",
      source: "codex-cli",
      projectPath: "/tmp",
      timestamp: 0,
      filePath,
    };

    const messages = loadSessionMessages(meta);
    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({ role: "user", content: "Old hello" });
  });

  it("skips malformed JSONL lines and continues parsing the rest", () => {
    const filePath = writeFile("mixed.jsonl", [
      JSON.stringify({ type: "user", timestamp: "2026-04-10T10:00:00Z", message: { role: "user", content: "first" } }),
      "{ this is not valid JSON",
      JSON.stringify({
        type: "assistant",
        timestamp: "2026-04-10T10:00:01Z",
        message: { role: "assistant", content: "third" },
      }),
    ]);

    const meta: SessionMeta = {
      id: "test",
      title: "t",
      source: "claude-cli",
      projectPath: "/tmp",
      timestamp: 0,
      filePath,
    };

    const messages = loadSessionMessages(meta);
    expect(messages).toHaveLength(2);
    expect(messages[0].content).toBe("first");
    expect(messages[1].content).toBe("third");
  });

  it("returns empty array when file does not exist", () => {
    const meta: SessionMeta = {
      id: "test",
      title: "t",
      source: "claude-cli",
      projectPath: "/tmp",
      timestamp: 0,
      filePath: path.join(tmpDir, "does-not-exist.jsonl"),
    };
    expect(loadSessionMessages(meta)).toEqual([]);
  });

  it("handles a session_meta line with a very long instructions field (regression test)", () => {
    // Reproduce the bug where Codex session_meta lines exceeded the 4 KB read buffer.
    // The first line is intentionally large; if loadSessionMessages reads the whole file
    // (which it does), it should still parse subsequent message lines correctly.
    const longInstructions = "x".repeat(20000);
    const filePath = writeFile("codex-long.jsonl", [
      JSON.stringify({
        type: "session_meta",
        timestamp: "2026-04-10T10:00:00Z",
        payload: { id: "long-1", cwd: "/tmp", instructions: longInstructions },
      }),
      JSON.stringify({
        type: "response_item",
        timestamp: "2026-04-10T10:00:01Z",
        payload: { type: "message", role: "user", content: [{ type: "input_text", text: "after long meta" }] },
      }),
    ]);

    const meta: SessionMeta = {
      id: "long-1",
      title: "t",
      source: "codex-cli",
      projectPath: "/tmp",
      timestamp: 0,
      filePath,
    };

    const messages = loadSessionMessages(meta);
    expect(messages).toHaveLength(1);
    expect(messages[0].content).toBe("after long meta");
  });
});
