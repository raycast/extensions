import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { promisify } from "node:util";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = ts.transpileModule(
  readFileSync(new URL("../src/studio.ts", import.meta.url), "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;

const processLine = (place = "123") =>
  `42 /Applications/RobloxStudio.app/Contents/MacOS/RobloxStudio --task EditPlace --placeId ${place} --universeId 456`;
const crashLine =
  "43 /Applications/RobloxStudio.app/Contents/MacOS/RobloxCrashHandler --studioPid 42 --attachment=attachment_log=/logs/test_Studio_42_last.log";
const loadingLog = (place = "123") =>
  `open place (identifier = ${place}) [start]\n[telemetryLog] placeid: ${place}\n[telemetryLog] State: OpenPlaceInitialization\n`;
const readyLog = (place = "123") =>
  `${loadingLog(place)}[telemetryLog] State: OpenPlaceSuccess\n[telemetryLog] placeid: ${place}\n`;

function harness() {
  const state = {
    now: 0,
    lock: undefined,
    processes: "",
    log: "",
    launches: 0,
    focuses: 0,
    hud: [],
    errors: [],
    failDiscovery: false,
    failLaunch: false,
    failFocus: false,
    unreadableLog: false,
  };
  const execFile = () => {};
  execFile[promisify.custom] = async (file, args) => {
    if (file === "/bin/ps") {
      if (state.failDiscovery) throw new Error("Process discovery failed");
      return { stdout: state.processes };
    }
    if (file === "/usr/bin/open") {
      if (state.failLaunch) throw new Error("Launch failed");
      assert.equal(args.includes("-n"), true);
      state.launches++;
    } else if (file === "/usr/bin/osascript") {
      if (state.failFocus) throw new Error("Focus failed");
      state.focuses++;
    }
    return { stdout: "" };
  };
  const mocks = {
    "node:path": { join },
    "node:util": { promisify },
    "@raycast/api": {
      environment: { supportPath: "/support" },
      closeMainWindow: async () => {},
      showHUD: async (message) => state.hud.push(message),
    },
    "node:child_process": { execFile },
    "node:fs/promises": {
      open: async () => {
        if (state.lock !== undefined)
          throw Object.assign(new Error(), { code: "EEXIST" });
        state.lock = state.now;
        return { close: async () => {} };
      },
      stat: async () => ({ mtimeMs: state.lock }),
      unlink: async () => {
        state.lock = undefined;
      },
      readFile: async () => {
        if (state.unreadableLog) throw new Error("Log unavailable");
        return state.log;
      },
    },
    "./utils": {
      settings: () => ({ placeId: "123", universeId: "456" }),
      run: async (_, action) => {
        try {
          await action();
        } catch (error) {
          state.errors.push(error);
        }
      },
      showError: async (error) => state.errors.push(error),
    },
  };
  const exports = {};
  runInNewContext(source, {
    exports,
    require: (name) => {
      assert.ok(name in mocks, `Unexpected module: ${name}`);
      return mocks[name];
    },
    Date: { now: () => state.now },
  });
  return { state, command: exports.default };
}

test("repeated invocations wait through process startup and slow loading, then focus", async () => {
  const { state, command } = harness();
  await command();
  await command(); // Launch Services has not created a process yet.
  assert.equal(state.launches, 1);
  assert.notEqual(state.lock, undefined);

  state.now = 10_000;
  state.processes = processLine(); // No crash handler or log yet.
  await command();
  state.now = 600_000; // Loading must not expire after a fixed timeout.
  state.processes += `\n${crashLine}`;
  state.log = loadingLog();
  await command();
  assert.equal(state.launches, 1);
  assert.equal(state.focuses, 0);
  assert.equal(state.hud.length, 3);

  state.log = readyLog();
  await command();
  assert.equal(state.launches, 1);
  assert.equal(state.focuses, 1);
  assert.equal(state.lock, undefined);
});

test("an unreadable log focuses the existing process instead of assuming loading", async () => {
  const { state, command } = harness();
  state.processes = `${processLine()}\n${crashLine}`;
  state.unreadableLog = true;
  await command();
  await command();
  assert.equal(state.launches, 0);
  assert.equal(state.hud.length, 0);
  assert.equal(state.focuses, 2);
});

test("an exited or never-started launch can be retried after the startup grace period", async () => {
  const { state, command } = harness();
  await command();
  state.now = 31_000;
  await command();
  assert.equal(state.launches, 2);
});

test("a failed open releases the lock for retry", async () => {
  const { state, command } = harness();
  state.failLaunch = true;
  await command();
  assert.equal(state.lock, undefined);
  state.failLaunch = false;
  await command();
  assert.equal(state.launches, 1);
});

test("failed process discovery does not risk a duplicate launch", async () => {
  const { state, command } = harness();
  state.failDiscovery = true;
  await command();
  assert.equal(state.launches, 0);
  assert.equal(state.errors.length, 1);
});

for (const [name, log] of [
  ["closed", `${readyLog()}RobloxBasicDoc::closeDocument\n`],
  [
    "switched",
    `${readyLog()}RobloxBasicDoc::closeDocument\n${readyLog("789")}`,
  ],
  ["switching", `${readyLog()}open place (identifier = 789) [start]\n`],
]) {
  test(`old startup arguments do not match a ${name} place`, async () => {
    const { state, command } = harness();
    state.processes = `${processLine()}\n${crashLine}`;
    state.log = log;
    await command();
    assert.equal(state.launches, 1);
    assert.equal(state.focuses, 0);
  });
}

test("reopening the same place waits for a fresh success event", async () => {
  const { state, command } = harness();
  state.processes = `${processLine()}\n${crashLine}`;
  state.log = `${readyLog()}RobloxBasicDoc::closeDocument\n${loadingLog()}`;
  await command();
  assert.equal(state.launches, 0);
  assert.equal(state.focuses, 0);
  assert.equal(state.hud.length, 1);
});

test("a different place's startup does not block the requested place", async () => {
  const { state, command } = harness();
  state.processes = processLine("1234");
  await command();
  assert.equal(state.launches, 1);
});

for (const logState of ["missing", "unreadable", "empty"]) {
  test(`unknown ${logState} log recovers after the startup grace period`, async () => {
    const { state, command } = harness();
    await command();
    state.processes = processLine();
    if (logState !== "missing") state.processes += `\n${crashLine}`;
    state.unreadableLog = logState === "unreadable";
    state.now = 10_000;
    await command();
    assert.equal(state.focuses, 0);
    state.now = 31_000;
    await command();
    assert.equal(state.focuses, 1);
    assert.equal(state.launches, 1);
    assert.equal(state.lock, undefined);
    await command();
    assert.equal(state.focuses, 2);
    assert.equal(state.launches, 1);
  });
}

test("unknown state with failed focus provides recovery without launching a duplicate", async () => {
  const { state, command } = harness();
  state.processes = processLine();
  state.failFocus = true;
  await command();
  assert.equal(state.launches, 0);
  assert.equal(state.lock, undefined);
  assert.match(state.errors[0].message, /quit Studio and retry/);
});
