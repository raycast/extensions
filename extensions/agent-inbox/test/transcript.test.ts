import { strict as assert } from "node:assert";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { parseClaudeHook } from "../src/core/adapters/claude";
import { lastClaudeAssistant, parseClaude, parseCodex, parseLines, readHeadTail } from "../src/core/transcript";
import { tempDir } from "./helpers";

test("head and tail sampling preserves a message crossing the chunk boundary", (t) => {
  const path = join(tempDir(t), "transcript.jsonl");
  const records = [
    { type: "user", message: { content: "Fix the CI" } },
    { type: "assistant", message: { content: "完成了，要提交吗？" } },
  ];
  const text = records.map((r) => JSON.stringify(r)).join("\n");
  writeFileSync(path, text);
  const headBytes = Buffer.byteLength(JSON.stringify(records[0])) + 12;
  const { head, tail } = readHeadTail(path, headBytes, 128);
  assert.equal(parseClaude(parseLines(head), parseLines(tail)).lastAssistant, "完成了，要提交吗？");
});

test("large transcripts discard partial records and retain the latest complete assistant message", (t) => {
  const path = join(tempDir(t), "large.jsonl");
  const text = [
    JSON.stringify({ type: "user", sessionId: "s", message: { content: "Fix the CI" } }),
    JSON.stringify({ type: "tool", content: "x".repeat(1000) }),
    JSON.stringify({ type: "assistant", message: { content: "All tests pass." } }),
    '{"type":',
  ].join("\n");
  writeFileSync(path, text);
  const { head, tail, size } = readHeadTail(path, 128, 128);
  const info = parseClaude(parseLines(head), parseLines(tail));
  assert.equal(size, Buffer.byteLength(text));
  assert.equal(info.firstPrompt, "Fix the CI");
  assert.equal(info.lastAssistant, "All tests pass.");
  assert.ok(Buffer.byteLength([...head, ...tail].join("\n")) < 256);
});

test("Claude Stop falls back to the transcript when no last message is supplied", (t) => {
  const path = join(tempDir(t), "transcript.jsonl");
  writeFileSync(path, JSON.stringify({ type: "assistant", message: { content: [{ type: "text", text: "要继续吗？" }] } }));
  const event = parseClaudeHook({ session_id: "s", hook_event_name: "Stop", transcript_path: path }, {})!;
  assert.equal(event.type, "stopped");
  assert.equal(event.attention, "question");
  assert.equal(event.attention, "question");
  assert.equal(lastClaudeAssistant(path + ".missing"), "");
});

test("transcript titles ignore injected instructions and retain explicit renames", () => {
  const info = parseClaude(
    [
      { type: "user", message: { content: "# AGENTS.md instructions\nDo something" } },
      { type: "user", isMeta: true, message: { content: "internal metadata" } },
      { type: "user", message: { content: "Build the app" } },
      { type: "summary", summary: "Generated title" },
    ],
    [
      { type: "custom-title", customTitle: "My title" },
      { type: "summary", summary: "Later summary" },
    ],
  );
  assert.equal(info.firstPrompt, "Build the app");
  assert.equal(info.title, "My title");
  const codex = parseCodex(
    [
      { type: "session_meta", payload: { id: "thread", cwd: "/repo", originator: "codex_app" } },
      {
        type: "response_item",
        payload: {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: "<environment_context>metadata</environment_context>" }],
        },
      },
      { type: "response_item", payload: { type: "message", role: "user", content: [{ type: "input_text", text: "Fix the bug" }] } },
    ],
    [{ type: "response_item", payload: { type: "message", role: "assistant", content: [{ type: "output_text", text: "Fixed." }] } }],
  );
  assert.equal(codex.firstPrompt, "Fix the bug");
  assert.equal(codex.lastAssistant, "Fixed.");
  assert.equal(codex.originator, "codex_app");
});

test("Claude source metadata can be recovered from the tail and follows a later CLI resume", () => {
  const fromTail = parseClaude(
    [{ type: "queue-operation" }],
    [{ type: "assistant", sessionId: "s", cwd: "/repo", entrypoint: "claude-desktop" }],
  );
  assert.equal(fromTail.entrypoint, "claude-desktop");
  assert.equal(fromTail.cwd, "/repo");
  const resumed = parseClaude([{ entrypoint: "claude-desktop" }], [{ entrypoint: "cli" }]);
  assert.equal(resumed.entrypoint, "cli");
});
