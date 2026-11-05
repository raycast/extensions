import { strict as assert } from "node:assert";
import { test } from "node:test";
import { appendFileSync, writeFileSync, renameSync } from "node:fs";
import { join } from "node:path";
import { Store } from "../src/core/db";
import { EventEngine } from "../src/core/engine";
import { DEFAULT_CONFIG } from "../src/core/config";
import { TranscriptCollector, readTranscriptBatch } from "../src/core/sources/collector";
import { codexAdapter } from "../src/core/adapters/codex";
import { claudeAdapter } from "../src/core/adapters/claude";
import { TranscriptStateRecovery } from "../src/core/transcript-state";
import { tempDir } from "./helpers";

const row = (at: number, type: string, payload: object) =>
  JSON.stringify({ timestamp: new Date(at).toISOString(), type, payload }) + "\n";
const question = (at: number, id: string, count = 1) =>
  row(at, "response_item", {
    type: "function_call",
    name: "request_user_input_async",
    call_id: id,
    arguments: JSON.stringify({ questions: Array.from({ length: count }, () => ({ title: "Choose" })) }),
  });
const answer = (at: number, id: string, index: number) =>
  row(at, "response_item", {
    type: "message",
    role: "user",
    content: [
      {
        type: "input_text",
        text: `<send_user_message_question_reply>${JSON.stringify([{ questionItemId: JSON.stringify(["request_user_input_async", id, index]), answer: "A" }])}</send_user_message_question_reply>`,
      },
    ],
  });

test("Codex desktop async acknowledgement and Stop retain all pending questions until matching answers", async (t) => {
  const directory = tempDir(t),
    path = join(directory, "rollout.jsonl");
  writeFileSync(
    path,
    row(1000, "session_meta", { id: "s", originator: "codex_app" }) +
      row(2000, "event_msg", { type: "task_started", turn_id: "t" }),
  );
  const store = new Store(join(directory, "db.sqlite"));
  await store.record({ agent: "codex", sessionId: "s", type: "started", transcriptPath: path, at: 500 });
  await store.setSubscribed("codex", "s", true);
  const engine = new EventEngine(store, () => ({ ...DEFAULT_CONFIG, notifications: false }));
  const collector = new TranscriptCollector(
    engine,
    () => [codexAdapter],
    (message) => assert.fail(message),
  );
  await collector.poll();
  assert.equal((await store.get("codex", "s"))!.host, "app");
  appendFileSync(
    path,
    question(3000, "call", 2) +
      row(3100, "response_item", { type: "function_call_output", call_id: "call", output: '{"accepted":true}' }) +
      row(4000, "event_msg", { type: "task_complete", turn_id: "t", last_agent_message: "请选择一个方案。" }),
  );
  await collector.poll();
  let current = (await store.get("codex", "s"))!;
  assert.equal(current.status, "needs_input");
  assert.equal(current.state!.pending.filter((p) => !p.inferred).length, 2);
  appendFileSync(path, answer(5000, "call", 0));
  await collector.poll();
  assert.ok((await store.get("codex", "s"))!.state!.pending.some((p) => p.id === "call:1"));
  appendFileSync(path, answer(6000, "call", 1));
  await collector.poll();
  current = (await store.get("codex", "s"))!;
  assert.equal(current.status, "ready");
  const revision = current.revision;
  await new TranscriptCollector(engine, () => [codexAdapter]).poll();
  assert.equal((await store.get("codex", "s"))!.revision, revision, "restart resumes cursor without replay");
});

test("initial collector snapshot repairs legacy completion without notifying about old history", async (t) => {
  const directory = tempDir(t),
    path = join(directory, "rollout.jsonl");
  writeFileSync(
    path,
    row(1000, "event_msg", { type: "task_started", turn_id: "t" }) +
      question(2000, "q") +
      row(3000, "event_msg", { type: "task_complete", turn_id: "t", last_agent_message: "Waiting" }),
  );
  const store = new Store(join(directory, "db.sqlite"));
  await store.record({ agent: "codex", sessionId: "s", type: "started", at: 1, transcriptPath: path });
  await store.setSubscribed("codex", "s", true);
  const errors: string[] = [];
  await new TranscriptCollector(
    new EventEngine(store, () => DEFAULT_CONFIG),
    () => [codexAdapter],
    (error) => errors.push(error),
  ).poll();
  assert.deepEqual(errors, []);
  assert.equal((await store.get("codex", "s"))!.status, "needs_input");
  assert.deepEqual(await store.claimNotifications(), []);
});

test("Claude structured question survives unrelated tool output and resolves only its own result", async (t) => {
  const directory = tempDir(t),
    path = join(directory, "claude.jsonl");
  const entry = (at: number, type: string, content: unknown, stop_reason?: string) =>
    JSON.stringify({ timestamp: new Date(at).toISOString(), type, message: { content, stop_reason } }) + "\n";
  writeFileSync(path, entry(1000, "user", "Help"));
  const store = new Store(join(directory, "db.sqlite"));
  await store.record({ agent: "claude", sessionId: "s", type: "started", transcriptPath: path, at: 1 });
  await store.setSubscribed("claude", "s", true);
  const collector = new TranscriptCollector(
    new EventEngine(store, () => ({ ...DEFAULT_CONFIG, notifications: false })),
    () => [claudeAdapter],
    (message) => assert.fail(message),
  );
  await collector.poll();
  appendFileSync(
    path,
    entry(2000, "assistant", [{ type: "tool_use", id: "q", name: "AskUserQuestion" }], "tool_use") +
      entry(3000, "user", [{ type: "tool_result", tool_use_id: "other" }]) +
      entry(4000, "assistant", [{ type: "text", text: "Waiting" }], "end_turn"),
  );
  await collector.poll();
  assert.equal((await store.get("claude", "s"))!.status, "needs_input");
  appendFileSync(path, entry(5000, "user", [{ type: "tool_result", tool_use_id: "q" }]));
  await collector.poll();
  assert.equal((await store.get("claude", "s"))!.status, "running");
});

test("bounded reader retries partial UTF-8 lines, handles rotation and skips oversized records", (t) => {
  const directory = tempDir(t),
    path = join(directory, "file");
  writeFileSync(path, row(1000, "event_msg", { type: "task_started" }));
  const first = readTranscriptBatch(path);
  const partial = Buffer.from(row(2000, "event_msg", { type: "user_message", message: "中文" }));
  appendFileSync(path, partial.subarray(0, partial.length - 3));
  const second = readTranscriptBatch(path, first.cursor);
  assert.equal(second.records.length, 0);
  assert.equal(second.cursor.offset, first.cursor.offset);
  appendFileSync(path, partial.subarray(partial.length - 3));
  const third = readTranscriptBatch(path, second.cursor);
  assert.equal(third.records.length, 1);
  renameSync(path, path + ".old");
  writeFileSync(path, row(3000, "event_msg", { type: "task_started" }));
  assert.equal(readTranscriptBatch(path, third.cursor).reset, true);
});

test("an oversized EOF record cannot keep bootstrap stuck or leak a suffix as a new record", (t) => {
  const path = join(tempDir(t), "large-eof.jsonl");
  writeFileSync(path, JSON.stringify({ output: "x".repeat(2 * 1024 * 1024) }));
  let batch = readTranscriptBatch(path, undefined, true);
  while (!batch.atEnd) batch = readTranscriptBatch(path, batch.cursor, true);
  assert.equal(batch.cursor.skipping, true);
  assert.deepEqual(batch.records, []);
  appendFileSync(path, "\n" + row(1000, "event_msg", { type: "task_started" }));
  const next = readTranscriptBatch(path, batch.cursor, true);
  assert.equal(next.records.length, 1);
  assert.equal(next.cursor.skipping, false);
});

test("read-only Codex recovery detects unanswered questions and respects a newer live turn", (t) => {
  const path = join(tempDir(t), "rollout.jsonl");
  writeFileSync(path, row(1000, "event_msg", { type: "task_started", turn_id: "t" }) + question(2000, "q"));
  const session = {
    agent: "codex",
    sessionId: "s",
    host: "app" as const,
    title: "",
    cwd: "",
    status: "idle" as const,
    attention: null,
    summary: "",
    locator: {},
    subscribed: true,
    handledAt: null,
    startedAt: 1,
    updatedAt: 1,
    transcriptPath: path,
  };
  const recovered = new TranscriptStateRecovery().recover([session])[0];
  assert.equal(recovered.status, "needs_input");
  assert.equal(session.status, "idle");
});

test("bootstrap finds an unanswered async question before a multi-megabyte tool result", async (t) => {
  const directory = tempDir(t),
    path = join(directory, "large.jsonl");
  writeFileSync(
    path,
    row(1000, "session_meta", { id: "s", originator: "codex_app" }) +
      row(2000, "event_msg", { type: "task_started", turn_id: "t" }) +
      question(3000, "early") +
      row(4000, "response_item", {
        type: "custom_tool_call_output",
        call_id: "unrelated",
        output: "x".repeat(3 * 1024 * 1024),
      }) +
      row(5000, "event_msg", { type: "task_complete", turn_id: "t" }),
  );
  const store = new Store(join(directory, "db.sqlite"));
  await store.record({ agent: "codex", sessionId: "s", type: "started", at: 1, transcriptPath: path });
  await store.setSubscribed("codex", "s", true);
  await new TranscriptCollector(
    new EventEngine(store, () => ({ ...DEFAULT_CONFIG, notifications: false })),
    () => [codexAdapter],
    (message) => assert.fail(message),
  ).poll();
  const session = (await store.get("codex", "s"))!;
  assert.equal(session.status, "needs_input");
  assert.deepEqual(
    session.state!.pending.map((p) => p.id),
    ["early:0"],
  );
  assert.equal(session.state!.phase, "ready");
});

test("Claude recoverable API retry errors do not become permanent user attention", async (t) => {
  const directory = tempDir(t),
    path = join(directory, "retry.jsonl");
  writeFileSync(
    path,
    [
      { timestamp: new Date(1000).toISOString(), type: "user", message: { content: "Continue" } },
      {
        timestamp: new Date(2000).toISOString(),
        type: "system",
        subtype: "api_error",
        retryInMs: 1000,
        error: "temporary",
      },
      {
        timestamp: new Date(3000).toISOString(),
        type: "assistant",
        message: { stop_reason: "end_turn", content: [{ type: "text", text: "Implemented." }] },
      },
    ]
      .map((entry) => JSON.stringify(entry))
      .join("\n") + "\n",
  );
  const store = new Store(join(directory, "db.sqlite"));
  await store.subscribeEntry({
    agent: "claude",
    sessionId: "s",
    host: "app",
    title: "",
    cwd: "",
    status: "needs_input",
    attention: "question",
    summary: "",
    locator: {},
    subscribed: true,
    handledAt: null,
    startedAt: 1,
    updatedAt: 10000,
    transcriptPath: path,
  });
  await new TranscriptCollector(
    new EventEngine(store, () => ({ ...DEFAULT_CONFIG, notifications: false })),
    () => [claudeAdapter],
    (message) => assert.fail(message),
  ).poll();
  assert.equal((await store.get("claude", "s"))!.status, "ready");
});
