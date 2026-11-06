import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execute = promisify(execFile);
const runner = fileURLToPath(new URL("./phase-2-compare.mjs", import.meta.url));
async function invoke(args, options = {}) {
  try {
    return { code: 0, ...(await execute(process.execPath, [runner, ...args], { timeout: 30000, ...options })) };
  } catch (error) {
    if (typeof error.code !== "number") throw error;
    return error;
  }
}
async function withTemporaryDirectory(action) {
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), "ondine-runner-test-"));
  try {
    await action(parent);
  } finally {
    await fs.rm(parent, { recursive: true, force: true });
  }
}

test("help describes opt-in native and non-overwriting output", async () => {
  const result = await invoke(["--help"]);
  assert.equal(result.code, 0);
  assert.match(result.stdout, /Existing directories are rejected/);
  assert.match(result.stdout, /does not change production routing/);
});

test("invalid fixture and duplicate themes are rejected before creating output", async () => {
  await withTemporaryDirectory(async (parent) => {
    const output = path.join(parent, "run");
    for (const option of ["--fixtures=does-not-exist", "--themes=github-dark,github-dark", "--timeout-ms=0"]) {
      const result = await invoke([output, option]);
      assert.notEqual(result.code, 0);
      await assert.rejects(fs.access(output), { code: "ENOENT" });
    }
  });
});

test("CLI refuses existing output without altering files", async () => {
  await withTemporaryDirectory(async (output) => {
    await fs.writeFile(path.join(output, "keep.txt"), "unchanged");
    const result = await invoke([output, "--fixtures=flowchart", "--themes=github-light"]);
    assert.notEqual(result.code, 0);
    assert.equal(await fs.readFile(path.join(output, "keep.txt"), "utf8"), "unchanged");
    assert.deepEqual(await fs.readdir(output), ["keep.txt"]);
  });
});

test("setup failure produces a failed report and gallery rather than success", async () => {
  await withTemporaryDirectory(async (parent) => {
    const output = path.join(parent, "run");
    const result = await invoke([output, "--fixtures=flowchart", "--themes=github-light"], {
      env: { ...process.env, ONDINE_SPIKE_BROWSER: path.join(parent, "missing-browser") },
    });
    assert.notEqual(result.code, 0);
    const report = JSON.parse(await fs.readFile(path.join(output, "phase-2-results.json"), "utf8"));
    assert.equal(report.summary.automationComplete, false);
    assert.equal(report.summary.expectedCases, 1);
    assert.equal(report.summary.recordedCases, 0);
    assert.equal(report.setupError.code, "ENOENT");
    assert.match(await fs.readFile(path.join(output, "gallery.html"), "utf8"), /NOT visual approval/);
  });
});

test("worker timeouts are recorded per case and later cases still run", async () => {
  await withTemporaryDirectory(async (parent) => {
    const output = path.join(parent, "run");
    const result = await invoke([output, "--fixtures=flowchart,sequence", "--themes=github-light", "--timeout-ms=100"]);
    assert.notEqual(result.code, 0);
    const report = JSON.parse(await fs.readFile(path.join(output, "phase-2-results.json"), "utf8"));
    assert.equal(report.summary.automationComplete, false);
    assert.equal(report.summary.recordedCases, 2);
    assert.equal(report.summary.failedCases, 2);
    assert.equal(report.summary.visualPending, 2);
    for (const row of report.results) {
      assert.equal(row.worker.timedOut, true);
      assert.match(row.workerError.message, /deadline/);
      assert.equal(row.visualReview.status, "pending");
      await fs.access(path.join(output, row.name, "result.json"));
    }
  });
});
