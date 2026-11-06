import { strict as assert } from "node:assert";
import { join } from "node:path";
import { test, TestContext } from "node:test";
import { Store } from "../src/core/db";
import { tempDir } from "./helpers";

const tmp = (t: TestContext) => new Store(join(tempDir(t), "db.sqlite"));

test("record, subscribe, handle, archive", async (context) => {
  const store = tmp(context);
  await store.record({
    agent: "claude",
    sessionId: "a",
    type: "progress",
    title: '它\'s "quoted"',
    cwd: "/x",
    at: 1,
    locator: { tty: "/dev/ttys001" },
  });
  await store.record({ agent: "codex", sessionId: "b", type: "needs_input", summary: "要不要？", at: 2 });
  assert.equal((await store.active()).length, 0, "unsubscribed sessions never appear, even when waiting");
  await store.setSubscribed("codex", "b", true);

  await store.setSubscribed("claude", "a", true);
  let a = (await store.get("claude", "a"))!;
  assert.equal(a.title, '它\'s "quoted"');
  assert.deepEqual(a.locator, { tty: "/dev/ttys001", observedAt: 1 });
  assert.equal(a.subscribed, true);

  const t = await store.record({ agent: "claude", sessionId: "a", type: "needs_input", at: 3 });
  assert.equal(t!.notify, true);
  await store.record({ agent: "claude", sessionId: "a", type: "progress", at: 4 });
  await store.record({ agent: "claude", sessionId: "a", type: "completed", summary: "done", at: 4 });
  assert.equal((await store.active()).length, 2);

  assert.equal(await store.archiveDone(10), 1);
  a = (await store.get("claude", "a"))!;
  assert.equal(a.handledAt, 10);
  assert.equal((await store.active()).length, 1);

  await store.markHandled("codex", "b", 11);
  assert.equal((await store.active()).length, 0);
  await store.record({ agent: "codex", sessionId: "b", type: "progress", at: 12 });
  assert.equal((await store.get("codex", "b"))!.handledAt, null);
});

test("subscribing to a history entry creates the row", async (context) => {
  const store = tmp(context);
  await store.subscribeEntry({
    agent: "codex",
    sessionId: "h",
    host: "cli",
    title: "old",
    cwd: "/y",
    status: "idle",
    attention: null,
    summary: "",
    locator: {},
    subscribed: false,
    handledAt: null,
    startedAt: 1,
    updatedAt: 1,
    transcriptPath: "/t.jsonl",
  });
  const row = (await store.get("codex", "h"))!;
  assert.equal(row.subscribed, true);
  assert.equal(row.status, "idle");
  assert.deepEqual(
    (await store.active()).map((s) => s.sessionId),
    ["h"],
  );
});

test("sessions with the same ID stay independent across agents and quoted IDs remain data", async (t) => {
  const store = tmp(t);
  const sessionId = "s'); DROP TABLE sessions; --";
  await store.record({ agent: "claude", sessionId, type: "progress", at: 1 });
  await store.record({ agent: "codex", sessionId, type: "needs_input", at: 2 });
  await store.setSubscribed("claude", sessionId, true);
  await store.markHandled("codex", sessionId, 3);
  assert.equal((await store.get("claude", sessionId))!.subscribed, true);
  assert.equal((await store.get("claude", sessionId))!.handledAt, null);
  assert.equal((await store.get("codex", sessionId))!.subscribed, false);
  assert.deepEqual(
    (await store.active()).map((s) => s.agent),
    ["claude"],
  );
  await store.unmarkHandled("codex", sessionId);
  assert.equal((await store.active()).length, 1, "unhandled alone does not subscribe");
  await store.setSubscribed("codex", sessionId, true);
  assert.equal((await store.active()).length, 2);
  assert.equal((await store.all(1))[0].agent, "codex");
});

test("subscribing stale history preserves a live session's state and locator", async (t) => {
  const store = tmp(t);
  await store.record({ agent: "claude", sessionId: "s", type: "started", at: 1 });
  const stale = (await store.get("claude", "s"))!;
  await store.record({
    agent: "claude",
    sessionId: "s",
    type: "progress",
    title: "Live title",
    locator: { tty: "/dev/ttys007" },
    at: 2,
  });
  await store.subscribeEntry(stale);
  const current = (await store.get("claude", "s"))!;
  assert.equal(current.subscribed, true);
  assert.equal(current.status, "running");
  assert.equal(current.title, "Live title");
  assert.deepEqual(current.locator, { tty: "/dev/ttys007", observedAt: 2 });
  assert.equal(current.updatedAt, 2);
});

test("subscribing history cannot overwrite a hook row after a stale absence check", async (t) => {
  const store = tmp(t);
  await store.record({ agent: "claude", sessionId: "s", type: "started", at: 1 });
  const stale = (await store.get("claude", "s"))!;
  await store.record({
    agent: "claude",
    sessionId: "s",
    type: "progress",
    title: "New live prompt",
    cwd: "/live",
    at: 20,
  });
  // Reproduce the stale result a separate existence check can return while a hook creates the row.
  store.get = async () => undefined;
  await store.subscribeEntry(stale);
  const current = (await new Store(store.path).get("claude", "s"))!;
  assert.equal(current.subscribed, true);
  assert.equal(current.status, "running");
  assert.equal(current.title, "New live prompt");
  assert.equal(current.cwd, "/live");
  assert.equal(current.updatedAt, 20);
});

test("a matched desktop window persists corrected identity without overwriting concurrent hook state", async (t) => {
  const store = tmp(t);
  await store.record({ agent: "codex", sessionId: "s", host: "cli", type: "started", at: 1 });
  const focused = {
    ...(await store.get("codex", "s"))!,
    host: "app" as const,
    title: "Renamed",
    locator: { hostId: "host-one" },
  };
  await store.record({ agent: "codex", sessionId: "s", type: "progress", locator: { tty: "/dev/ttys007" }, at: 2 });
  await store.subscribeEntry(focused, { focused: true });
  const current = (await store.get("codex", "s"))!;
  assert.equal(current.host, "app");
  assert.equal(current.title, "Renamed");
  assert.equal(current.subscribed, true);
  assert.equal(current.status, "running");
  assert.equal(current.updatedAt, 2);
  assert.deepEqual(current.locator, { tty: "/dev/ttys007", hostId: "host-one", observedAt: 2 });
});

test("resubscribing restores handled sessions and archive only affects subscriptions", async (t) => {
  const store = tmp(t);
  for (const sessionId of ["subscribed", "unsubscribed"]) {
    await store.record({ agent: "claude", sessionId, type: "completed", at: 1 });
  }
  await store.setSubscribed("claude", "subscribed", true);
  assert.equal(await store.archiveDone(2), 1);
  assert.equal((await store.get("claude", "unsubscribed"))!.handledAt, null);
  assert.equal((await store.active()).length, 0);
  const archived = (await store.get("claude", "subscribed"))!;
  await store.subscribeEntry(archived);
  assert.equal((await store.get("claude", "subscribed"))!.handledAt, null);
  assert.equal((await store.active()).length, 1);
  await store.markHandled("claude", "subscribed", 3);
  await store.setSubscribed("claude", "subscribed", false);
  assert.equal((await store.active()).length, 0);
  await store.setSubscribed("claude", "subscribed", true);
  assert.equal((await store.get("claude", "subscribed"))!.handledAt, null);
  assert.equal((await store.active()).length, 1);
});

test("archive completed includes recovered history without persisting status or hiding newer hook events", async (t) => {
  const store = tmp(t);
  for (const sessionId of ["history", "newer-hook", "waiting"]) {
    await store.record({ agent: "claude", sessionId, type: "started", at: 1 });
    await store.setSubscribed("claude", sessionId, true);
  }
  const observed = (await store.active()).map((s) => ({ ...s, status: "done" as const }));
  await store.record({ agent: "claude", sessionId: "newer-hook", type: "progress", at: 2 });
  await store.record({ agent: "claude", sessionId: "waiting", type: "needs_input", at: 1 });
  assert.equal(await store.archiveDone(3, observed), 1);
  const history = (await store.get("claude", "history"))!;
  assert.equal(history.status, "idle", "inferred completion is never written back as a hook event");
  assert.equal(history.handledAt, 3);
  assert.deepEqual((await store.active()).map((s) => s.sessionId).sort(), ["newer-hook", "waiting"]);
});
