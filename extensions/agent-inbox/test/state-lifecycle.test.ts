import { strict as assert } from "node:assert";
import { test } from "node:test";
import { applyEvent } from "../src/core/status";
import { parseClaudeHook, CLAUDE_EVENTS } from "../src/core/adapters/claude";
import { parseCodexNotify, parseCodexHook, CODEX_HOOK_EVENTS } from "../src/core/adapters/codex";
import { Session, AgentEvent } from "../src/core/types";

function reduce(events: Partial<AgentEvent>[], initial?: Session): Session {
  let session = initial;
  for (const event of events)
    session = applyEvent(session, { agent: "codex", sessionId: "s", type: "progress", at: 100, ...event })?.next ?? session;
  return session!;
}

test("turn end and process exit never assert that the user's task was completed", () => {
  assert.equal(reduce([{ type: "progress" }, { type: "stopped" }]).status, "ready");
  assert.equal(reduce([{ type: "progress" }, { type: "ended" }]).status, "unknown");
  assert.equal(reduce([{ type: "completed" }]).status, "done");
});

test("both adapters recognize non-question-mark requests and questions followed by prose", () => {
  for (const text of ["请确认后我再继续。", "请选择 A 或 B", "是否继续？\n选择后我将开始执行。", "Please confirm before I continue."]) {
    const events = [
      parseCodexNotify({ type: "agent-turn-complete", "thread-id": "s", "last-assistant-message": text }, {}, 100),
      parseClaudeHook({ hook_event_name: "Stop", session_id: "s", last_assistant_message: text }, {}, 100),
    ];
    for (const event of events) assert.equal(applyEvent(undefined, event!)?.next.status, "needs_input", text);
  }
});

test("pending requests survive stops, completion, unrelated activity and another turn", () => {
  const pending = reduce([
    { type: "progress", turnId: "t1" },
    { type: "needs_input", turnId: "t1", requestIds: ["q1"], attention: "question" },
  ]);
  for (const type of ["stopped", "completed", "ended", "tool"] as const) {
    assert.equal(reduce([{ type, turnId: "t1", at: 101 }], pending).status, "needs_input", type);
  }
  const another = reduce(
    [
      { type: "progress", turnId: "t2", at: 110 },
      { type: "needs_input", requestIds: ["q2"], attention: "question", turnId: "t2", at: 120 },
    ],
    pending,
  );
  const one = reduce([{ type: "resolved", requestIds: ["q1"], turnId: "t1", at: 130 }], another);
  assert.deepEqual(
    one.state!.pending.map((p) => p.id),
    ["q2"],
  );
  const ended = reduce(
    [
      { type: "stopped", turnId: "t2", at: 140 },
      { type: "resolved", requestIds: ["q2"], at: 150 },
    ],
    one,
  );
  assert.equal(ended.status, "ready");
});

test("old and wrong-turn completion cannot overwrite new questions; answered requests cannot reopen", () => {
  const waiting = reduce([
    { type: "progress", turnId: "t2", at: 200 },
    { type: "needs_input", turnId: "t2", requestIds: ["q2"], at: 210 },
  ]);
  assert.equal(applyEvent(waiting, { agent: "codex", sessionId: "s", type: "stopped", at: 100 }), null);
  assert.equal(applyEvent(waiting, { agent: "codex", sessionId: "s", type: "stopped", turnId: "t1", at: 220 }), null);
  const resolved = reduce([{ type: "resolved", requestIds: ["q2"], at: 220 }], waiting);
  assert.equal(reduce([{ type: "needs_input", requestIds: ["q2"], at: 230 }], resolved).status, "running");
});

test("legacy notifications do not duplicate or outlive structured approval requests", () => {
  const start = { ...reduce([{ type: "progress" }]), subscribed: true };
  const structured = reduce([{ type: "needs_input", attention: "permission", requestIds: ["p"] }], start);
  const reminder = applyEvent(structured, { agent: "codex", sessionId: "s", type: "needs_input", attention: "permission", at: 101 })!;
  assert.equal(reminder.notify, false);
  assert.equal(reminder.next.state!.pending.length, 1);
  assert.equal(reduce([{ type: "tool", requestIds: ["p"], at: 102 }], reminder.next).status, "running");
});

test("Claude and Codex collect structured questions and approvals without answering them", () => {
  for (const parse of [parseClaudeHook, parseCodexHook]) {
    const base = { session_id: "s", tool_use_id: "call", tool_name: "AskUserQuestion" };
    assert.equal(parse({ ...base, hook_event_name: "PreToolUse" }, {}, 1)?.attention, "question");
    assert.deepEqual(parse({ ...base, hook_event_name: "PermissionRequest" }, {}, 1)?.requestIds, ["call"]);
    assert.deepEqual(parse({ ...base, hook_event_name: "PostToolUse" }, {}, 2)?.requestIds, ["call"]);
  }
  assert.ok(CLAUDE_EVENTS.includes("StopFailure"));
  assert.ok(CODEX_HOOK_EVENTS.includes("PermissionRequest"));
});

test("Claude permission reminders cannot duplicate or outlive AskUserQuestion", () => {
  const question = parseClaudeHook(
    { session_id: "s", hook_event_name: "PreToolUse", tool_name: "AskUserQuestion", tool_use_id: "color-question" },
    {},
    101,
  )!;
  const reminder = parseClaudeHook(
    { session_id: "s", hook_event_name: "Notification", notification_type: "permission_prompt", message: "Claude needs your input" },
    {},
    102,
  )!;
  const answer = parseClaudeHook(
    {
      session_id: "s",
      hook_event_name: "PostToolUse",
      tool_name: "AskUserQuestion",
      tool_use_id: "color-question",
      tool_response: { answers: { color: "Blue" } },
    },
    {},
    103,
  )!;
  for (const events of [
    [question, reminder],
    [{ ...reminder, at: 100 }, question],
  ]) {
    const initial = { ...reduce([{ agent: "claude", type: "progress", at: 99 }]), subscribed: true };
    const waiting = reduce(events, initial);
    assert.equal(waiting.attention, "question");
    assert.deepEqual(
      waiting.state!.pending.map((request) => request.id),
      ["color-question"],
    );
    assert.equal(applyEvent(waiting, { ...reminder, at: 104 })!.notify, false);
    const answered = reduce([answer, { agent: "claude", type: "stopped", at: 105 }], waiting);
    assert.equal(answered.status, "ready");
    assert.deepEqual(answered.state!.pending, []);
  }
});

test("independent structured approvals and failures survive an answered question", () => {
  const waiting = reduce([
    { type: "needs_input", attention: "permission", requestIds: ["approval"], at: 100 },
    { type: "needs_input", attention: "question", requestIds: ["question"], at: 101 },
    { type: "quota", at: 102 },
  ]);
  const answered = reduce([{ type: "resolved", requestIds: ["question"], at: 103 }], waiting);
  assert.deepEqual(
    answered.state!.pending.map((request) => request.id),
    ["approval", "hint:quota"],
  );
  assert.equal(answered.status, "needs_input");
});

test("late transcript requests and matching replies reconcile after a newer stop without rolling back its phase", () => {
  const ready = reduce([
    { type: "progress", turnId: "t", at: 100 },
    { type: "stopped", turnId: "t", at: 300 },
  ]);
  const delayed = reduce([{ type: "needs_input", source: "transcript", requestIds: ["q"], turnId: "t", at: 200 }], ready);
  assert.equal(delayed.status, "needs_input");
  assert.equal(delayed.state!.at, 300);
  const answered = reduce([{ type: "resolved", requestIds: ["q"], turnId: "t", at: 250 }], delayed);
  assert.equal(answered.status, "ready");
  assert.equal(reduce([{ type: "needs_input", requestIds: ["q"], turnId: "t", at: 200 }], answered).status, "ready");
});

test("quoted examples in a finished report do not become inferred questions", () => {
  const text = "已完成检查。\n\n| 示例 | 结果 |\n| 请确认后我再继续。 | 待输入 |\n\n测试全部通过。";
  const event = parseCodexNotify({ type: "agent-turn-complete", "thread-id": "s", "last-assistant-message": text }, {}, 100)!;
  assert.equal(applyEvent(undefined, event)!.next.status, "ready");
});

test("late bootstrap snapshots close answered requests without replacing a newer turn", () => {
  const live = reduce([
    { type: "needs_input", requestIds: ["old"], turnId: "t1", at: 100 },
    { type: "progress", turnId: "t2", at: 300 },
    { type: "needs_input", requestIds: ["new"], turnId: "t2", at: 310 },
  ]);
  const recovered = reduce([
    { type: "progress", turnId: "t1", at: 50 },
    { type: "needs_input", requestIds: ["old"], turnId: "t1", at: 100 },
    { type: "resolved", requestIds: ["old"], turnId: "t1", at: 200 },
    { type: "stopped", turnId: "t1", at: 250 },
  ]);
  const merged = reduce([{ type: "snapshot", turnId: "t1", at: 250, snapshot: recovered.state }], live);
  assert.deepEqual(
    merged.state!.pending.map((p) => p.id),
    ["new"],
  );
  assert.equal(merged.state!.turnId, "t2");
  assert.equal(merged.state!.phase, "running");
  assert.equal(merged.state!.at, 310);
});
