import { strict as assert } from "node:assert";
import { test } from "node:test";
import { startWorker, workerPolicy, WorkerKind } from "../service/worker";

// Real child processes verify cancellation and bounded output, not just mocked promises.
const options = {
  models: "/tmp/local-search-models",
  scratch: "/tmp/local-search-private-scratch",
  memoryLimitMb: 1024,
  timeoutMs: 5000,
};

// Interactive queries need normal scheduling; only indexing should receive a utility clamp.
test("worker policy caps memory and reserves utility scheduling for indexing", () => {
  const query = workerPolicy("/bin/sleep", ["1"], options);
  assert.equal(query.command, "/usr/sbin/taskpolicy");
  assert.deepEqual(query.args, ["-m", "1024", "/bin/sleep", "1"]);
  const index = workerPolicy("/bin/sleep", ["1"], {
    ...options,
    kind: WorkerKind.Index,
  });
  assert.ok(index.args.includes("utility"));
  assert.ok(index.args.includes("/usr/bin/nice"));
});

test("worker preserves untrusted arguments without invoking a shell", async () => {
  const query = "--reindex; $(touch /tmp/SHOULD_NOT_EXIST)";
  const worker = startWorker("/usr/bin/printf", ["%s", query], options);
  assert.equal(await worker.done, query);
});

test("worker cannot inherit an alternate model runtime", async () => {
  process.env.DIGUP_WORKER_DIR = "/tmp/alternate-runtime";
  try {
    const env = await startWorker("/usr/bin/env", [], options).done;
    assert.match(env, /DIGUP_MODELS=\/tmp\/local-search-models/);
    assert.doesNotMatch(env, /DIGUP_WORKER_DIR/);
    assert.match(env, /TMPDIR=\/tmp\/local-search-private-scratch/);
  } finally {
    delete process.env.DIGUP_WORKER_DIR;
  }
});

test("timed-out workers are reaped", async () => {
  const worker = startWorker("/bin/sleep", ["10"], {
    ...options,
    timeoutMs: 20,
  });
  await assert.rejects(worker.done, /time budget/);
  assert.throws(() => process.kill(worker.pid!, 0));
});

test("aborted searches are reaped", async () => {
  const abort = new AbortController();
  const worker = startWorker("/bin/sleep", ["10"], {
    ...options,
    signal: abort.signal,
  });
  abort.abort();
  await assert.rejects(worker.done, /cancelled/);
  assert.throws(() => process.kill(worker.pid!, 0));
});

test("worker rejects bounded output overflow", async () => {
  const worker = startWorker(
    process.execPath,
    ["-e", 'process.stdout.write("x".repeat(5 * 1024 * 1024))'],
    options,
  );
  await assert.rejects(worker.done, /too much output/);
});

test("memory polling stops and reaps an over-budget worker", async () => {
  const worker = startWorker(
    process.execPath,
    ["-e", "setInterval(() => {}, 1000)"],
    { ...options, memoryLimitMb: 1 },
  );
  await assert.rejects(worker.done, /memory budget/);
  assert.throws(() => process.kill(worker.pid!, 0));
});
