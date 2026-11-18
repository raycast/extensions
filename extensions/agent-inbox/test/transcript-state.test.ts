import { strict as assert } from "node:assert";
import { appendFileSync, readFileSync, readdirSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fromHistory, mergeSessions } from "../src/core/merge";
import { claudeTurnState } from "../src/core/transcript";
import { TranscriptStateRecovery } from "../src/core/transcript-state";
import { HistoryEntry, Session } from "../src/core/types";
import { tempDir } from "./helpers";

const json = (entry: unknown) => JSON.stringify(entry);
const completed = (text = "Implemented and verified.") => ({
  type: "assistant",
  message: { role: "assistant", stop_reason: "end_turn", content: [{ type: "text", text }] },
});

function idle(path: string): Session {
  return {
    agent: "claude",
    sessionId: "claude-session",
    host: "app",
    title: "Existing conversation",
    cwd: "/project",
    status: "idle",
    attention: null,
    summary: "Existing summary",
    locator: {},
    subscribed: true,
    handledAt: 7,
    startedAt: 100,
    updatedAt: 200,
    transcriptPath: path,
  };
}

test("Claude end_turn survives post-stop bookkeeping and does not use completed-turn metadata as evidence", () => {
  const lines = [
    completed(),
    { type: "system", subtype: "stop_hook_summary", hookCount: 1 },
    { type: "artifact", artifact: {} },
    { type: "queue-operation", operation: "dequeue" },
    { type: "cost", costUsd: 0.2 },
    { type: "system", subtype: "turn_duration", durationMs: 100 },
  ].map(json);
  assert.deepEqual(claudeTurnState(lines), { status: "ready", attention: null });
  assert.equal(claudeTurnState([json({ completedTurns: 13, lastTurnEdgeAt: 123 })]), undefined);
  assert.equal(claudeTurnState([json({ type: "assistant", message: { content: "All done!" } })]), undefined);
  assert.deepEqual(claudeTurnState([json(completed("要继续处理下一项吗？"))]), {
    status: "needs_input",
    attention: "question",
  });
});

test("later activity or incomplete records invalidate an earlier Claude completion", () => {
  const activity = [
    { type: "user", message: { content: "Continue" } },
    { type: "user", message: { content: [{ type: "tool_result", content: "result" }] } },
    { type: "tool", content: "working" },
    { type: "tool_use", name: "read" },
    { type: "tool_result", content: "result" },
    { type: "progress", data: {} },
    { type: "stream_event", event: {} },
    { type: "assistant", message: { stop_reason: "tool_use", content: [{ type: "tool_use", name: "read" }] } },
    { type: "assistant", message: { stop_reason: null, content: [{ type: "text", text: "Working" }] } },
    { type: "system", subtype: "api_error" },
  ];
  for (const entry of activity) assert.equal(claudeTurnState([json(completed()), json(entry)]), undefined, json(entry));
  assert.equal(claudeTurnState([json(completed()), '{"type":"user",']), undefined);
  assert.deepEqual(claudeTurnState([json(completed()), json(activity[0]), json(completed("Finished again."))]), {
    status: "ready",
    attention: null,
  });
});

test("idle recovery is read-only and preserves authoritative hooks, subscription state and timestamps", (t) => {
  const root = tempDir(t);
  const path = join(root, "transcript.jsonl");
  const originalText = json(completed());
  writeFileSync(path, originalText);
  const original = idle(path);
  const recovery = new TranscriptStateRecovery();
  const recovered = recovery.recover([original])[0];
  assert.equal(recovered.status, "ready");
  assert.equal(original.status, "idle", "do not mutate the database-shaped input");
  assert.deepEqual({ ...recovered, status: "idle" }, original, "only display status/attention changes");
  for (const status of ["running", "needs_input", "ready"] as const) {
    const live = { ...original, status, attention: status === "needs_input" ? ("permission" as const) : null };
    assert.equal(recovery.recover([live])[0], live);
  }
  const codex = { ...original, agent: "codex" };
  assert.equal(recovery.recover([codex])[0], codex, "Unsupported transcript format is left alone");
  assert.equal(readFileSync(path, "utf8"), originalText);
  assert.deepEqual(readdirSync(root), ["transcript.jsonl"], "recovery creates no persistent cache or database");
});

test("bounded suffix recovery rejects completion hidden before a gap and refreshes changed cache entries", (t) => {
  const root = tempDir(t);
  const path = join(root, "large.jsonl");
  writeFileSync(path, json(completed()) + "\n" + json({ type: "artifact", data: "x".repeat(200_000) }) + "\n");
  const recovery = new TranscriptStateRecovery();
  const original = idle(path);
  assert.equal(recovery.recover([original])[0], original, "do not infer from a final record before an unread middle");
  appendFileSync(path, json(completed()) + "\n" + json({ type: "system", subtype: "stop_hook_summary" }) + "\n");
  assert.equal(recovery.recover([original])[0].status, "ready");
  appendFileSync(path, json({ type: "user", message: { content: "Next task" } }) + "\n");
  assert.equal(recovery.recover([original])[0].status, "idle", "a later user message clears cached completion");
  writeFileSync(path, json(completed("Need help?")));
  assert.equal(recovery.recover([original])[0].status, "needs_input");
  const previous = statSync(path);
  writeFileSync(path, json(completed("Need help!")));
  utimesSync(path, previous.atime, new Date(previous.mtimeMs + 1000));
  assert.equal(statSync(path).size, previous.size);
  assert.equal(recovery.recover([original])[0].status, "ready", "same-size changes invalidate by mtime");
  const missing = { ...original, transcriptPath: join(root, "missing") };
  assert.equal(recovery.recover([missing])[0], missing);
});

test("history conversion and merge recover completed idle sessions but preserve live hook state", (t) => {
  const path = join(tempDir(t), "history.jsonl");
  writeFileSync(path, json(completed()));
  const history: HistoryEntry = {
    agent: "claude",
    sessionId: "claude-session",
    title: "History",
    host: "app",
    cwd: "/project",
    summary: "Finished",
    transcriptPath: path,
    startedAt: 1,
    updatedAt: 2,
  };
  assert.equal(fromHistory(history).status, "ready");
  assert.equal(mergeSessions([], [history])[0].status, "ready");
  const hook = { ...idle(""), title: "Hook", status: "running" as const };
  assert.equal(mergeSessions([hook], [history])[0].status, "running");
  const idleHook = { ...hook, status: "idle" as const };
  const merged = mergeSessions([idleHook], [history])[0];
  assert.equal(merged.status, "ready");
  assert.equal(merged.title, "Hook");
  assert.equal(merged.updatedAt, idleHook.updatedAt);
  assert.equal(merged.handledAt, idleHook.handledAt);
});
