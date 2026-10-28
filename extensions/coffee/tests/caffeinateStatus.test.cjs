const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const { runInNewContext } = require("node:vm");
const ts = require("typescript");

function loadUtils() {
  const source = readFileSync(path.join(__dirname, "..", "src", "utils.ts"), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 },
  });
  const exports = {};
  runInNewContext(outputText, {
    exports,
    process: { platform: "darwin" },
    require: () => ({}),
  });
  return exports;
}

const { parseCaffeinateProcesses } = loadUtils();
const now = 1_800_000_000_000;

// Real `ps -o etime,args= -p $(pgrep caffeinate)` output: Coffee's 8 hour caffeinate plus a
// short-lived one started later by another app (Claude Code runs `caffeinate -i -t 300`).
const coffeePlusShortLived = `ELAPSED
   12:40 /usr/bin/caffeinate -u -di -t 28800
   00:54 caffeinate -i -t 300
`;

test("reports not running when no caffeinate process exists", () => {
  assert.deepEqual({ ...parseCaffeinateProcesses("", now) }, { isRunning: false, totalSeconds: null, startTime: null });
});

test("ignores the ps header line", () => {
  assert.deepEqual(
    { ...parseCaffeinateProcesses("ELAPSED\n", now) },
    { isRunning: false, totalSeconds: null, startTime: null },
  );
});

test("parses a single timed caffeinate", () => {
  assert.deepEqual(
    { ...parseCaffeinateProcesses("ELAPSED\n   01:00 caffeinate -di -t 3600\n", now) },
    { isRunning: true, totalSeconds: 3600, startTime: now - 60_000 },
  );
});

test("reports the caffeinate that ends furthest in the future, not the last one listed", () => {
  assert.deepEqual(
    { ...parseCaffeinateProcesses(coffeePlusShortLived, now) },
    { isRunning: true, totalSeconds: 28800, startTime: now - (12 * 60 + 40) * 1000 },
  );
});

test("picks the later end time regardless of listing order", () => {
  const reversed = `ELAPSED
   00:54 caffeinate -i -t 300
   12:40 /usr/bin/caffeinate -u -di -t 28800
`;
  assert.equal(parseCaffeinateProcesses(reversed, now).totalSeconds, 28800);
});

test("a caffeinate without -t outlasts any timed one", () => {
  const output = `ELAPSED
 1-02:03:04 /usr/bin/caffeinate -di
   00:54 caffeinate -i -t 300
`;
  assert.deepEqual(
    { ...parseCaffeinateProcesses(output, now) },
    { isRunning: true, totalSeconds: null, startTime: now - (86400 + 2 * 3600 + 3 * 60 + 4) * 1000 },
  );
});

test("a short-lived caffeinate still wins once it outlasts a nearly expired one", () => {
  const output = `ELAPSED
 07:59:00 /usr/bin/caffeinate -u -di -t 28800
   00:10 caffeinate -i -t 300
`;
  assert.equal(parseCaffeinateProcesses(output, now).totalSeconds, 300);
});
