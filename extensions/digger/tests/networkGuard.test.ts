import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { untilAborted } from "../src/utils/networkGuard.ts";

// AbortSignal.timeout's timer is unref'd, so with only a never-settling promise
// pending, node --test sees an empty event loop and stops. The Raycast process
// stays alive; this keeps the test process alive the same way.
let keepAlive: ReturnType<typeof setInterval>;
before(() => {
  keepAlive = setInterval(() => undefined, 1000);
});
after(() => clearInterval(keepAlive));

test("a stalled guard check rejects when the caller's deadline fires", async () => {
  const stalled = new Promise<never>(() => undefined); // a dns.lookup that never answers
  const started = Date.now();
  await assert.rejects(untilAborted(stalled, AbortSignal.timeout(50)), { name: "TimeoutError" });
  assert.ok(Date.now() - started < 1000);
});

test("an already-aborted signal rejects without waiting", async () => {
  const controller = new AbortController();
  controller.abort(new Error("superseded"));
  await assert.rejects(untilAborted(new Promise<never>(() => undefined), controller.signal), /superseded/);
});

test("a check that answers first is passed through unchanged", async () => {
  assert.equal(await untilAborted(Promise.resolve("allowed"), AbortSignal.timeout(1000)), "allowed");
  assert.equal(await untilAborted(Promise.resolve("allowed"), undefined), "allowed");
});
