import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
  compareRgba,
  createRunDirectory,
  decodeImage,
  recordStage,
  runIsolatedWorker,
  summarizeRows,
} from "./phase-2-evidence.mjs";

const image = (width, height, values) => ({ width, height, data: new Uint8ClampedArray(values) });

test("equal RGBA produces a zero diff without declaring visual acceptance", () => {
  const result = compareRgba(image(1, 1, [20, 30, 40, 255]), image(1, 1, [20, 30, 40, 255]));
  assert.equal(result.changedPixels, 0);
  assert.equal(result.maxChannelDelta, 0);
  assert.equal(result.totalPixels, 1);
  assert.deepEqual([...result.diff], [0, 0, 0, 255]);
  assert.equal(result.visualReview, undefined);
});

test("RGBA comparison includes alpha and retains tiny differences", () => {
  const result = compareRgba(
    image(2, 1, [10, 20, 30, 255, 10, 20, 30, 255]),
    image(2, 1, [11, 20, 30, 255, 10, 20, 30, 254]),
  );
  assert.equal(result.changedPixels, 2);
  assert.equal(result.maxChannelDelta, 1);
  assert.equal(result.changedPixelFraction, 1);
  assert.deepEqual([...result.diff], [32, 0, 0, 255, 32, 0, 0, 255]);
});

test("different dimensions are rejected even when pixel counts match", () => {
  assert.throws(() => compareRgba(image(2, 1, Array(8).fill(0)), image(1, 2, Array(8).fill(0))), /dimension/i);
});

test("zero, fractional, excessive dimensions and truncated pixels are rejected", () => {
  for (const bad of [image(0, 1, []), image(1.5, 1, []), image(100000, 100000, []), image(1, 1, [0])]) {
    assert.throws(() => compareRgba(bad, bad), /dimension|length|limit/i);
  }
});

test("image loading uses decode and rejects a complete but broken image", async () => {
  let decoded = false;
  class BrokenImage {
    complete = true;
    async decode() {
      decoded = true;
      throw new Error("broken SVG");
    }
  }
  await assert.rejects(decodeImage("data:image/svg+xml,bad", BrokenImage), /broken SVG/);
  assert.equal(decoded, true);
});

test("decoded images must have nonzero natural dimensions", async () => {
  class EmptyImage {
    naturalWidth = 0;
    naturalHeight = 0;
    async decode() {}
  }
  await assert.rejects(decodeImage("data:image/png,empty", EmptyImage), /dimension/i);
});

test("stage errors are recorded and later independent stages can still run", async () => {
  const stages = {};
  assert.equal(
    await recordStage(stages, "first", async () => {
      throw new Error("conversion failed");
    }),
    false,
  );
  assert.equal(await recordStage(stages, "next", async () => ({ file: "new.png" })), true);
  assert.equal(stages.first.status, "error");
  assert.match(stages.first.error.message, /conversion failed/);
  assert.equal(stages.next.status, "ok");
});

test("a run refuses an existing directory and leaves its contents untouched", async () => {
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), "ondine-evidence-test-"));
  try {
    const destination = path.join(parent, "run");
    assert.equal(await createRunDirectory(destination), destination);
    await fs.writeFile(path.join(destination, "keep.txt"), "unchanged");
    await assert.rejects(createRunDirectory(destination), /exist/i);
    assert.equal(await fs.readFile(path.join(destination, "keep.txt"), "utf8"), "unchanged");
  } finally {
    await fs.rm(parent, { recursive: true, force: true });
  }
});

function completeRow() {
  return {
    completed: true,
    generated: Object.fromEntries(
      ["svg", "original", "materialized", "production"].map((key) => [key, { status: "ok" }]),
    ),
    measured: Object.fromEntries(["materialization", "production"].map((key) => [key, { status: "ok" }])),
    visualReview: { status: "pending", reviewer: null, reason: null },
  };
}

test("successful automation leaves visual verdict pending", () => {
  const result = summarizeRows([completeRow()], 1);
  assert.equal(result.automationComplete, true);
  assert.equal(result.visualPending, 1);
  assert.equal(result.failedCases, 0);
});

test("missing stages, worker failure and missing cases cannot count as success", () => {
  const missing = completeRow();
  delete missing.generated.production;
  const errored = completeRow();
  errored.workerError = { message: "timeout" };
  assert.equal(summarizeRows([missing, errored], 2).failedCases, 2);
  assert.equal(summarizeRows([completeRow()], 2).automationComplete, false);
});

test("requested native errors affect automation, but skipped native does not", () => {
  const row = completeRow();
  row.generated.native = { status: "skipped" };
  assert.equal(summarizeRows([row], 1).automationComplete, true);
  row.generated.native = { status: "error", error: { message: "native failed" } };
  assert.equal(summarizeRows([row], 1).automationComplete, false);
});

test("a generated native PNG still requires successful measurement when requested", () => {
  const row = completeRow();
  row.nativeRequested = true;
  assert.equal(summarizeRows([row], 1).automationComplete, false);
  row.generated.native = { status: "ok" };
  assert.equal(summarizeRows([row], 1).automationComplete, false);
  row.measured.native = { status: "ok" };
  assert.equal(summarizeRows([row], 1).automationComplete, true);
});

test("isolated worker reports a failed process", async () => {
  const result = await runIsolatedWorker(["-e", "process.stderr.write('expected failure'); process.exit(2)"], {
    timeoutMs: 5000,
  });
  assert.equal(result.code, 2);
  assert.equal(result.timedOut, false);
  assert.match(result.stderr, /expected failure/);
});

test("worker deadline also stops detached descendants", { skip: process.platform === "win32" }, async () => {
  const script = `const { spawn } = require("node:child_process");
    const child = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { detached: true, stdio: "ignore" });
    console.log(child.pid); setInterval(() => {}, 1000);`;
  const result = await runIsolatedWorker(["-e", script], { timeoutMs: 700 });
  const pid = Number(result.stdout.trim());
  assert.ok(Number.isInteger(pid) && pid > 0);
  try {
    let state = "";
    try {
      state = execFileSync("ps", ["-p", String(pid), "-o", "stat="], { encoding: "utf8" }).trim();
    } catch (error) {
      if (error.status !== 1) throw error;
    }
    assert.ok(!state || state.startsWith("Z"), `Detached descendant still running: ${pid} ${state}`);
  } finally {
    try {
      process.kill(-pid, "SIGKILL");
    } catch (error) {
      if (error.code !== "ESRCH") throw error;
    }
  }
});

test("isolated worker bounds a stuck process", async () => {
  const result = await runIsolatedWorker(["-e", "setInterval(() => {}, 1000)"], { timeoutMs: 150 });
  assert.equal(result.timedOut, true);
  assert.equal(result.signal, "SIGKILL");
});
