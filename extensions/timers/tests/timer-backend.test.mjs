import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");

function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "raycast timer records 茶-"));
  const launched = [];
  const prefs = { selectedSound: "pianoChime.wav", volumeSetting: "0.5", ringContinuously: false };
  const api = {
    environment: { supportPath: directory, assetsPath: resolve("assets") },
    getPreferenceValues: () => prefs,
    getApplications: async () => [{ name: "Raycast", windowsAppId: "test.app" }],
    showToast: async () => {},
    confirmAlert: async () => true,
    Toast: { Style: { Failure: "failure", Success: "success" } },
    Icon: { Bell: "bell" },
  };
  const modules = new Map();
  function load(path) {
    path = resolve(path);
    if (modules.has(path)) return modules.get(path).exports;
    const module = { exports: {} };
    modules.set(path, module);
    const output = ts.transpileModule(readFileSync(path, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    }).outputText;
    vm.runInNewContext(
      output,
      {
        module,
        exports: module.exports,
        process,
        console,
        require: (name) => {
          if (name === "@raycast/api") return api;
          if (name === "@chrismessina/raycast-kit") return { showError: async () => {} };
          if (name.startsWith("rust:"))
            return {
              notification_app_id: async () => "test.native.app",
              ensure_timer_worker: async (json) => {
                launched.push(JSON.parse(json));
                return 1234;
              },
            };
          if (name.startsWith(".")) return load(resolve(dirname(path), `${name}.ts`));
          return require(name);
        },
      },
      { filename: path },
    );
    return module.exports;
  }
  return {
    directory,
    launched,
    backend: load("src/backend/timerBackend.ts"),
    cleanup: () => rmSync(directory, { recursive: true, force: true }),
  };
}

test(
  "Windows paths, simultaneous timer names, fractional durations and per-timer speech survive persistence",
  { skip: process.platform !== "win32" },
  async () => {
    const f = fixture();
    try {
      await Promise.all(
        Array.from({ length: 2 }, () =>
          f.backend.startTimer({
            timeInSeconds: 2.5,
            timerName: "Tea 茶 <&\"'",
            selectedSound: "speak_timer_name",
            skipRingContinuouslyWarning: true,
          }),
        ),
      );
      const files = readdirSync(f.directory).filter((file) => file.endsWith(".timer"));
      assert.equal(files.length, 2);
      const timers = f.backend.getTimers();
      assert.ok(timers.every((timer) => timer.secondsSet === 2.5 && timer.name === "Tea 茶 <&\"'"));
      assert.ok(
        f.launched.every((config) => config.timerFile.startsWith(f.directory) && config.speak && config.volume === 0.5),
      );
      assert.equal(f.launched[0].notificationAppId, "test.native.app");
    } finally {
      f.cleanup();
    }
  },
);

test(
  "Windows pause/resume uses the persisted deadline without rounding away milliseconds",
  { skip: process.platform !== "win32" },
  async () => {
    const f = fixture();
    try {
      const file = new Date().toISOString().replaceAll(":", "__") + `---10---${randomUUID()}.timer`;
      const pausedAt = Date.now();
      const raw = {
        name: "Tea",
        workerId: randomUUID(),
        lastPaused: new Date(pausedAt).toISOString(),
        pauseElapsed: 0,
        selectedSound: "pianoChime.wav",
        windows: { deadline: pausedAt + 1250 },
      };
      writeFileSync(join(f.directory, file), JSON.stringify(raw));
      const timer = f.backend.getTimers()[0];
      assert.equal(timer.timeLeft, 1);
      const before = Date.now();
      await f.backend.unpauseTimer(timer);
      const after = Date.now();
      const config = f.launched[0];
      assert.ok(config.deadline >= before + 1250 && config.deadline <= after + 1250);
      const resumed = JSON.parse(readFileSync(join(f.directory, file), "utf8"));
      assert.equal(resumed.lastPaused, "---");
      assert.notEqual(resumed.workerId, raw.workerId);
      f.backend.pauseTimer(file, resumed.pid);
      assert.notEqual(JSON.parse(readFileSync(join(f.directory, file), "utf8")).lastPaused, "---");
      f.backend.stopTimer(file);
      assert.equal(f.backend.getTimers().length, 0);
    } finally {
      f.cleanup();
    }
  },
);

test(
  "invalid durations are rejected before creating timer records",
  { skip: process.platform !== "win32" },
  async () => {
    const f = fixture();
    try {
      for (const duration of [0, -1, NaN, Infinity, Number.MAX_VALUE]) {
        await assert.rejects(
          f.backend.startTimer({ timeInSeconds: duration, skipRingContinuouslyWarning: true }),
          /duration/,
        );
      }
      assert.equal(readdirSync(f.directory).length, 0);
    } finally {
      f.cleanup();
    }
  },
);

test("editing a preset preserves its identity and menu visibility and rejects invalid updates", () => {
  const f = fixture();
  try {
    f.backend.createCustomTimer({ name: "Tea", timeInSeconds: 60, selectedSound: "default", showInMenuBar: false });
    const id = Object.keys(f.backend.readCustomTimers())[0];
    f.backend.updateCustomTimer(id, { name: "Green Tea", timeInSeconds: 150.5, selectedSound: "speak_timer_name" });
    assert.deepEqual(Object.keys(f.backend.readCustomTimers()), [id]);
    const edited = f.backend.readCustomTimers()[id];
    assert.equal(edited.name, "Green Tea");
    assert.equal(edited.timeInSeconds, 150.5);
    assert.equal(edited.selectedSound, "speak_timer_name");
    assert.equal(edited.showInMenuBar, false);
    for (const value of [0, -1, NaN, Infinity])
      assert.throws(() => f.backend.updateCustomTimer(id, { ...edited, timeInSeconds: value }));
    assert.throws(() => f.backend.updateCustomTimer("deleted", edited), /no longer exists/);
    assert.equal(f.backend.readCustomTimers()[id].timeInSeconds, 150.5);
  } finally {
    f.cleanup();
  }
});

test("new menu-bar defaults preserve saved visibility choices", () => {
  const f = fixture();
  try {
    writeFileSync(join(f.directory, "defaultPresetVisibles.json"), JSON.stringify({ "2M": false, "25M": false }));
    const defaults = f.backend.readDefaultPresetVisibles();
    assert.equal(defaults["1M"], true);
    assert.equal(defaults["25M"], false);
    assert.equal(defaults["2M"], false);
    f.backend.toggleDefaultPresetVisibility("1M");
    assert.equal(f.backend.readDefaultPresetVisibles()["1M"], false);
  } finally {
    f.cleanup();
  }
});

test(
  "Windows rounds sub-millisecond durations up to native integer deadlines",
  { skip: process.platform !== "win32" },
  async () => {
    const f = fixture();
    try {
      for (const seconds of [60.0005, 0.0004]) {
        const before = Date.now();
        await f.backend.startTimer({ timeInSeconds: seconds, skipRingContinuouslyWarning: true });
        const after = Date.now();
        const config = f.launched.at(-1);
        assert.ok(Number.isSafeInteger(config.deadline));
        assert.ok(config.deadline >= before + Math.ceil(seconds * 1000));
        assert.ok(config.deadline <= after + Math.ceil(seconds * 1000));
      }
    } finally {
      f.cleanup();
    }
  },
);
