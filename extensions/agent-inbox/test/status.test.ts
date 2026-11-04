import { strict as assert } from "node:assert";
import { test } from "node:test";
import { applyEvent, endsWithQuestion, filterSessions, groupInbox, inboxSection, toTitle, waitingCount } from "../src/core/status";
import { AgentEvent, Session } from "../src/core/types";

const ev = (type: AgentEvent["type"], extra: Partial<AgentEvent> = {}): AgentEvent => ({
  agent: "claude",
  sessionId: "s1",
  type,
  at: 1000,
  ...extra,
});

function run(events: AgentEvent[], start?: Session): Session {
  let s = start;
  for (const e of events) {
    const t = applyEvent(s, e);
    if (t) s = t.next;
  }
  return s!;
}

test("new session starts idle and gets its title from the first prompt", () => {
  const s = run([
    ev("started", { cwd: "/p" }),
    ev("progress", { title: "写文章：Session manager 选题\n更多" }),
    ev("progress", { title: "second" }),
  ]);
  assert.equal(s.status, "running");
  assert.equal(s.title, "写文章：Session manager 选题");
  assert.equal(s.cwd, "/p");
});

test("only a matching tool result resolves a structured permission request", () => {
  const waiting = run([ev("progress"), ev("needs_input", { attention: "permission", requestIds: ["tool-1"] })]);
  assert.equal(run([ev("tool", { requestIds: ["other"] })], waiting).status, "needs_input");
  assert.equal(run([ev("tool", { requestIds: ["tool-1"] })], waiting).status, "running");
});

test("notify only for subscribed sessions entering needs_input", () => {
  const s = run([ev("progress")]);
  assert.equal(applyEvent(s, ev("needs_input"))!.notify, false);
  const sub = { ...s, subscribed: true };
  assert.equal(applyEvent(sub, ev("needs_input"))!.notify, true);
  const already = run([ev("needs_input")], sub);
  assert.equal(applyEvent(already, ev("needs_input"))!.notify, false, "no repeat notification");
  assert.equal(applyEvent(sub, ev("stopped"))!.notify, false, "done never notifies");
});

test("handled sessions come back only when the status changes", () => {
  const done = { ...run([ev("progress"), ev("stopped")]), subscribed: true, handledAt: 5 };
  assert.equal(inboxSection(done), null);
  assert.equal(run([ev("ended")], done).handledAt, 5);
  const again = run([ev("progress")], done);
  assert.equal(again.handledAt, null);
  assert.equal(inboxSection(again), "subscribed");
});

test("subscriptions: only subscribed, unhandled sessions appear, including idle history", () => {
  const mk = (id: string, status: Session["status"], subscribed: boolean, updatedAt: number): Session => ({
    ...run([ev("progress", { sessionId: id })]),
    status,
    subscribed,
    updatedAt,
  });
  const list = [
    mk("a", "needs_input", false, 50),
    mk("b", "needs_input", true, 10),
    mk("c", "running", false, 1),
    mk("d", "running", true, 1),
    mk("e", "done", true, 1),
    mk("f", "idle", true, 1),
  ];
  const g = groupInbox(list);
  assert.deepEqual(
    g.needs_input.map((s) => s.sessionId),
    ["b"],
  );
  assert.deepEqual(
    g.subscribed.map((s) => s.sessionId),
    ["d", "f"],
  );
  assert.deepEqual(
    g.done.map((s) => s.sessionId),
    ["e"],
  );
  assert.deepEqual(Object.keys(g), ["needs_input", "subscribed", "done"]);
  assert.equal(waitingCount(list), 1);
  assert.equal(inboxSection({ ...list[1], handledAt: 100 }), null);
  assert.equal(waitingCount([{ ...list[1], handledAt: 100 }]), 0);
});

test("question heuristic", () => {
  assert.equal(endsWithQuestion("初稿写完了。要不要挪到开头？"), true);
  assert.equal(endsWithQuestion("Shall I continue?**"), true);
  assert.equal(endsWithQuestion("Done.\n```js\nfoo?\n```"), false);
  assert.equal(endsWithQuestion("All tests pass."), false);
});

test("titles are single-line and trimmed", () => {
  assert.equal(toTitle("  \n# Fix the CI\nmore"), "Fix the CI");
  assert.equal(toTitle("x".repeat(200)).length, 80);
});

test("failure and quota transitions notify once, survive session end and clear when work resumes", () => {
  for (const type of ["failed", "quota"] as const) {
    const initial = { ...run([ev("progress")]), subscribed: true, handledAt: 5 };
    const attention = applyEvent(initial, ev(type))!;
    assert.equal(attention.next.status, "needs_input");
    assert.equal(attention.next.attention, type);
    assert.equal(attention.next.handledAt, null);
    assert.equal(attention.notify, true);
    assert.equal(applyEvent(attention.next, ev(type))!.notify, false);
    const ended = run([ev("ended")], attention.next);
    assert.equal(ended.attention, type);
    assert.equal(ended.status, "needs_input");
    const resumed = run([ev("progress")], ended);
    assert.equal(resumed.status, "running");
    assert.equal(resumed.attention, null);
  }
});

test("events with sparse metadata preserve the session title, location and transcript", () => {
  const initial = run([
    ev("progress", { title: "Original", cwd: "/repo", transcriptPath: "/transcript", locator: { tty: "/dev/ttys001", tmuxPane: "%2" } }),
  ]);
  const next = run(
    [ev("needs_input", { title: "Another title", cwd: "", transcriptPath: "", locator: { tty: "", tmuxPane: undefined, hostId: "host" } })],
    initial,
  );
  assert.equal(next.title, "Original");
  assert.equal(next.cwd, "/repo");
  assert.equal(next.transcriptPath, "/transcript");
  assert.deepEqual(next.locator, { tty: "/dev/ttys001", tmuxPane: "%2", hostId: "host" });
});

test("all-session filters preserve running discovery and allow subscription/status overlap", () => {
  const sessions: Session[] = [
    { ...run([ev("progress", { sessionId: "running" })]), subscribed: false },
    { ...run([ev("needs_input", { sessionId: "waiting" })]), subscribed: true },
    { ...run([ev("completed", { sessionId: "done" })]), subscribed: true },
    { ...run([ev("started", { sessionId: "history" })]), subscribed: true },
    { ...run([ev("needs_input", { sessionId: "unsubscribed-waiting" })]), subscribed: false },
  ];
  const ids = (filter: Parameters<typeof filterSessions>[1]) => filterSessions(sessions, filter).map((s) => s.sessionId);
  assert.deepEqual(ids("all"), ["running", "waiting", "done", "history", "unsubscribed-waiting"]);
  assert.deepEqual(ids("subscribed"), ["waiting", "done", "history"]);
  assert.deepEqual(ids("needs_input"), ["waiting", "unsubscribed-waiting"]);
  assert.deepEqual(ids("done"), ["done"]);
  assert.deepEqual(filterSessions([], "subscribed"), []);
});
