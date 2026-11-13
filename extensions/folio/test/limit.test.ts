import { test } from "node:test";
import assert from "node:assert/strict";
import { failFast, keyedLimiter } from "../src/lib/limit.ts";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function tracker() {
  const running = new Map<string, number>();
  const peak = new Map<string, number>();
  /** Start order, e.g. ["conn-a", "conn-a", "conn-b", ...]. */
  const starts: string[] = [];
  return {
    peak,
    starts,
    task: (key: string, ms: number, result?: unknown) => async () => {
      starts.push(key);
      const n = (running.get(key) ?? 0) + 1;
      running.set(key, n);
      peak.set(key, Math.max(peak.get(key) ?? 0, n));
      await sleep(ms);
      running.set(key, (running.get(key) ?? 1) - 1);
      return result;
    },
  };
}

test("at most 2 at a time on one connection; other connections aren't held up", async () => {
  const run = keyedLimiter(2);
  const t = tracker();
  await Promise.all([
    ...Array.from({ length: 8 }, () => run("conn-a", t.task("conn-a", 20))),
    run("conn-b", t.task("conn-b", 20)),
    run("conn-b", t.task("conn-b", 20)),
  ]);
  assert.equal(t.peak.get("conn-a"), 2);
  assert.equal(t.peak.get("conn-b"), 2);
  // conn-b was queued behind 8 conn-a tasks but starts in the first round, not after conn-a drains.
  assert.deepEqual(t.starts.slice(0, 4).sort(), ["conn-a", "conn-a", "conn-b", "conn-b"]);
});

test("a newcomer can't jump the queue when a slot is handed over", async () => {
  const run = keyedLimiter(2);
  const t = tracker();
  const first = Array.from({ length: 3 }, () => run("k", t.task("k", 15)));
  await sleep(16); // first two finish and hand their slots to the queued third
  const late = run("k", t.task("k", 15));
  await Promise.all([...first, late]);
  assert.equal(t.peak.get("k"), 2);
});

test("returns results, propagates errors and frees the slot on failure", async () => {
  const run = keyedLimiter(1);
  await assert.rejects(
    run("k", async () => {
      throw new Error("429");
    }),
    /429/,
  );
  assert.equal(await run("k", async () => "ok"), "ok");
});

test("queued tasks start in order", async () => {
  const run = keyedLimiter(1);
  const order: number[] = [];
  await Promise.all(
    [1, 2, 3, 4].map((i) =>
      run("k", async () => {
        order.push(i);
        await sleep(2);
      }),
    ),
  );
  assert.deepEqual(order, [1, 2, 3, 4]);
});

test("failFast: after one timeout on a connection, its queued requests fail at once; others carry on", async () => {
  const timeout = new Error("SnapTrade didn't respond within 60 s");
  const run = keyedLimiter(2);
  const stalled = failFast((e) => e === timeout);
  const started: string[] = [];
  const task = (key: string, id: string, fails: boolean) => () =>
    run(key, () =>
      stalled(key, async () => {
        started.push(id);
        await sleep(20);
        if (fails) throw timeout;
        return id;
      }),
    );
  const results = await Promise.allSettled([
    task("ws", "ws1", true)(),
    task("ws", "ws2", true)(),
    task("ws", "ws3", false)(),
    task("ws", "ws4", false)(),
    task("webull", "wb1", false)(),
  ]);
  assert.deepEqual(
    results.map((r) => r.status),
    ["rejected", "rejected", "rejected", "rejected", "fulfilled"],
  );
  assert.ok(
    results.slice(2, 4).every((r) => r.status === "rejected" && r.reason === timeout),
    "same error reused",
  );
  assert.deepEqual(started.sort(), ["wb1", "ws1", "ws2"], "ws3 and ws4 never ran, so no second round of waiting");
});

test("failFast ignores errors that don't trip it", async () => {
  const stalled = failFast(() => false);
  await assert.rejects(
    stalled("k", async () => {
      throw new Error("429");
    }),
  );
  assert.equal(await stalled("k", async () => "ok"), "ok");
});
