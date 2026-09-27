import test from "node:test";
import assert from "node:assert/strict";
import { setImmediate } from "node:timers/promises";
import { cancellableIO, LatestTask } from "../src/cancellation";
import {
  gitAt,
  listRepositoryWorktrees,
  scanWorktrees,
} from "../src/worktree-data";

function gate() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

test("replacement waits for uncancellable IO and skips superseded queued scans", async () => {
  const runner = new LatestTask();
  const blocked = gate(),
    started = gate();
  const events: string[] = [];
  const first = runner.run(async (signal) => {
    started.release();
    try {
      await cancellableIO(signal, () => blocked.promise);
      events.push("stale result");
    } finally {
      events.push("first settled");
    }
  });
  const firstRejected = assert.rejects(first, { name: "AbortError" });
  await started.promise;
  const second = runner.run(async () => {
    events.push("second started");
  });
  const secondRejected = assert.rejects(second, { name: "AbortError" });
  const third = runner.run(async () => {
    events.push("third started");
  });
  await setImmediate();
  assert.deepEqual(events, []);
  blocked.release();
  await Promise.all([firstRejected, secondRejected, third]);
  assert.deepEqual(events, ["first settled", "third started"]);
});

test("unmount cancellation prevents a queued scan from starting", async () => {
  const runner = new LatestTask();
  const pending = runner.run(async () => {
    assert.fail("must not run");
  });
  runner.cancel();
  await assert.rejects(pending, { name: "AbortError" });
});

test("cancelled filesystem failures are not converted to scan warnings", async () => {
  const controller = new AbortController();
  await assert.rejects(
    cancellableIO(controller.signal, async () => {
      controller.abort();
      throw new Error("filesystem error");
    }),
    { name: "AbortError" },
  );
  await assert.rejects(
    scanWorktrees(["/does-not-exist"], { signal: controller.signal }),
    { name: "AbortError" },
  );
  await assert.rejects(
    listRepositoryWorktrees("/does-not-exist", controller.signal),
    { name: "AbortError" },
  );
});

test("cancellation reaches a running Git child and waits for it to close", async () => {
  const controller = new AbortController();
  // hash-object waits for its open stdin; it neither changes a repository nor spawns children.
  const pending = gitAt(
    process.cwd(),
    ["hash-object", "--stdin"],
    5000,
    controller.signal,
  );
  const rejected = assert.rejects(pending, { name: "AbortError" });
  await setImmediate();
  controller.abort();
  await rejected;
  assert.equal(
    (await gitAt(process.cwd(), ["--version"])).startsWith("git version"),
    true,
  );
});
