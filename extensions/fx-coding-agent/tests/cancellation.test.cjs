const assert = require("node:assert/strict");
const { test } = require("node:test");
const { readFileSync, mkdtempSync, existsSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const path = require("node:path");
const Module = require("node:module");
const { setTimeout: delay } = require("node:timers/promises");
const ts = require("typescript");

// Run the production runner without loading Raycast's native host. Only the
// unused preferences and AppleScript imports are stubbed; processes are real.
const filename = path.resolve(__dirname, "../src/lib/fx.ts");
const runner = new Module(filename, module);
runner.paths = module.paths;
runner.require = (id) => (id === "@raycast/api" || id === "@raycast/utils" ? {} : require(id));
runner._compile(
  ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } })
    .outputText,
  filename,
);
const { runFx, runFxJson, FxCommandError } = runner.exports;

const fixture = (source, options) => runFx(process.execPath, ["-e", source], { cwd: tmpdir(), ...options });
async function waitFor(predicate) {
  for (let i = 0; i < 150; i++) {
    if (predicate()) return;
    await delay(20);
  }
  assert.fail("Fixture condition was not reached");
}
function alive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error.code === "ESRCH") return false;
    throw error;
  }
}

test("pre-aborted requests never spawn, even with an invalid workspace", async () => {
  const controller = new AbortController();
  controller.abort();
  const directory = mkdtempSync(path.join(tmpdir(), "fx-cancel-"));
  const marker = path.join(directory, "started");
  try {
    await assert.rejects(
      fixture(`require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'started')`, {
        signal: controller.signal,
        cwd: path.join(directory, "missing"),
      }),
      { name: "AbortError" },
    );
    assert.equal(existsSync(marker), false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("immediate cancellation after spawn rejects once and allows a fresh request", async () => {
  const controller = new AbortController();
  const request = fixture("setInterval(() => {}, 1000)", { signal: controller.signal });
  const rejected = assert.rejects(request, { name: "AbortError" });
  controller.abort();
  controller.abort();
  await rejected;
  assert.equal(await fixture("process.stdout.write('fresh')"), "fresh");
});

for (const mode of ["cancel", "timeout"]) {
  test(`${mode} stops descendants that ignore SIGTERM after their parent exits`, async () => {
    const directory = mkdtempSync(path.join(tmpdir(), "fx-cancel-"));
    const pidsFile = path.join(directory, "pids");
    const readyFile = path.join(directory, "ready");
    const controller = new AbortController();
    const descendant = `process.on('SIGTERM', () => {}); require('node:fs').writeFileSync(${JSON.stringify(readyFile)}, 'ready'); setInterval(() => {}, 1000)`;
    const source = `
      const child = require('node:child_process').spawn(process.execPath, ['-e', ${JSON.stringify(descendant)}], {stdio: 'ignore'});
      require('node:fs').writeFileSync(${JSON.stringify(pidsFile)}, JSON.stringify([process.pid, child.pid]));
      setInterval(() => {}, 1000);
    `;
    let pids = [];
    try {
      const request = fixture(source, { signal: controller.signal, timeoutMs: mode === "timeout" ? 700 : 10000 });
      const rejected = assert.rejects(request, (error) => {
        assert.equal(mode === "cancel" ? error.name : error.kind, mode === "cancel" ? "AbortError" : "timeout");
        return true;
      });
      await waitFor(() => existsSync(readyFile));
      pids = JSON.parse(readFileSync(pidsFile, "utf8"));
      if (mode === "cancel") controller.abort();
      await rejected;
      await waitFor(() => pids.every((pid) => !alive(pid)));
    } finally {
      for (const pid of pids) {
        try {
          process.kill(pid, "SIGKILL");
        } catch {
          /* Already stopped. */
        }
      }
      rmSync(directory, { recursive: true, force: true });
    }
  });
}

test("cancellation cannot return partial valid JSON as success", async () => {
  const controller = new AbortController();
  const request = runFxJson(
    process.execPath,
    ["-e", 'process.stdout.write(\'{"output":"partial"}\'); setInterval(() => {}, 1000)'],
    {
      cwd: tmpdir(),
      signal: controller.signal,
    },
  );
  const rejected = assert.rejects(request, { name: "AbortError" });
  await delay(200);
  controller.abort();
  await rejected;
});

test("timeout cannot return partial valid JSON as success", async () => {
  await assert.rejects(
    runFxJson(process.execPath, ["-e", 'process.stdout.write(\'{"output":"partial"}\'); setInterval(() => {}, 1000)'], {
      cwd: tmpdir(),
      timeoutMs: 200,
    }),
    (error) => error instanceof FxCommandError && error.kind === "timeout" && error.stdout.includes("partial"),
  );
});

test("normal success cleans up the abort listener and keeps JSON error responses", async () => {
  const controller = new AbortController();
  const { getEventListeners } = require("node:events");
  assert.equal(await fixture("process.stdout.write('ok')", { signal: controller.signal }), "ok");
  assert.equal(getEventListeners(controller.signal, "abort").length, 0);
  controller.abort();
  assert.deepEqual(
    await runFxJson(
      process.execPath,
      ["-e", 'process.stdout.write(\'{"error":"failed","exit_code":1}\'); process.exitCode = 1'],
      { cwd: tmpdir() },
    ),
    { error: "failed", exit_code: 1 },
  );
});

test("spawn errors and invalid JSON still fail and clean up listeners", async () => {
  const controller = new AbortController();
  const { getEventListeners } = require("node:events");
  await assert.rejects(
    runFx(path.join(tmpdir(), "nonexistent-fx-test-binary"), [], { signal: controller.signal }),
    (error) => error.kind === "not-installed",
  );
  assert.equal(getEventListeners(controller.signal, "abort").length, 0);
  await assert.rejects(
    runFxJson(process.execPath, ["-e", "process.stdout.write('invalid')"], { cwd: tmpdir() }),
    /invalid JSON/,
  );
});
