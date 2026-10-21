const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { readFileSync, mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const path = require("node:path");
const { after, mock } = require("node:test");
const { runInNewContext } = require("node:vm");
const ts = require("typescript");

function loadSource(filename, dependencies, context = {}, cache = new Map()) {
  if (cache.has(filename)) return cache.get(filename);
  const source = readFileSync(path.join(__dirname, "..", "src", filename), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023, jsx: ts.JsxEmit.React },
  });
  const exports = {};
  cache.set(filename, exports);
  runInNewContext(outputText, {
    exports,
    process,
    console,
    React: dependencies.react,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    ...context,
    require(name) {
      if (name in dependencies) return dependencies[name];
      if (name.startsWith("node:")) return require(name);
      if (name.startsWith(".")) {
        const stem = path.join(path.dirname(filename), name);
        return loadSource(`${stem}.ts`, dependencies, context, cache);
      }
      assert.fail(`Unexpected dependency: ${name}`);
    },
  });
  return exports;
}

function createHarness(options = {}) {
  const supportPath = mkdtempSync(path.join(tmpdir(), "coffee-test-"));
  after(() => rmSync(supportPath, { recursive: true, force: true }));
  const storage = options.storage ?? new Map();
  const table = new Map();
  const createdAt = "Wed Oct 21 10:00:00 2026";
  const addProcess = (pid, values = {}) => {
    const row = { pid, uid: 501, createdAt, executable: "/usr/bin/caffeinate", ...values };
    table.set(pid, row);
    return row;
  };
  addProcess(100, { executable: "/usr/bin/node" });
  const fakeProcess = {
    ...process,
    platform: options.platform ?? "darwin",
    pid: 100,
    ppid: 99,
    getuid: () => 501,
    kill: mock.fn((pid) => {
      if (!table.delete(pid)) throw Object.assign(new Error("Process exited"), { code: "ESRCH" });
    }),
  };
  let nextPid = 200;
  const makeChild = () => {
    const child = new EventEmitter();
    child.pid = nextPid++;
    addProcess(child.pid);
    child.unref = mock.fn();
    child.kill = mock.fn(() => table.delete(child.pid));
    queueMicrotask(() => child.emit("spawn"));
    return child;
  };
  const processes = {
    spawn: mock.fn(makeChild),
    execFileSync: mock.fn((executable) => {
      if (executable === "/usr/bin/lsappinfo") return "pid=99";
      assert.fail(`Unexpected synchronous process query: ${executable}`);
    }),
    execFile: mock.fn((executable, args, options, callback) => {
      assert.equal(executable, "/bin/ps");
      const pidIndex = args.indexOf("-p");
      const rows = [...table.values()].filter((p) => pidIndex < 0 || p.pid === Number(args[pidIndex + 1]));
      const output = rows.map((p) => `${p.pid} ${p.uid} ${p.createdAt} ${p.executable}`).join("\n");
      queueMicrotask(() =>
        callback(rows.length ? null : Object.assign(new Error("No process"), { code: 1 }), output, ""),
      );
    }),
  };
  const preferences = { preventDisplay: true, preventSystem: true, preventDisk: true, ...options.preferences };
  const api = {
    environment: { supportPath, launchType: "background" },
    showHUD: mock.fn(async () => {}),
    showToast: mock.fn(async () => {}),
    popToRoot: mock.fn(async () => {}),
    closeMainWindow: mock.fn(async () => {}),
    PopToRootType: { Immediate: "immediate" },
    updateCommandMetadata: mock.fn(async () => {}),
    Toast: { Style: { Failure: "failure", Animated: "animated" } },
    getPreferenceValues: () => preferences,
    launchCommand: mock.fn(async () => {}),
    LaunchType: { Background: "background", UserInitiated: "user" },
    LocalStorage: {
      getItem: mock.fn(async (key) => storage.get(key)),
      removeItem: mock.fn(async (key) => storage.delete(key)),
      setItem: mock.fn(async (key, value) => storage.set(key, value)),
    },
  };
  const windows = {
    windowsGetCaffeinationState: mock.fn(async () => ({
      isRunning: false,
      sessionId: null,
      isManaged: false,
      externalCount: null,
      totalSeconds: null,
      startTime: null,
    })),
    windowsStartCaffeinate: mock.fn(async () => "200:123456789012345678"),
    windowsStopCaffeinate: mock.fn(async () => {}),
    windowsStopCaffeinateIfMatches: mock.fn(async () => false),
  };
  const dependencies = { "@raycast/api": api, "node:child_process": processes, "./windowsApi": windows };
  const context = { process: fakeProcess };
  const load = (filename, extra = {}) => loadSource(filename, { ...dependencies, ...extra }, context);
  return {
    api,
    processes,
    fakeProcess,
    storage,
    table,
    addProcess,
    makeChild,
    load,
    windows,
    preferences,
    supportPath,
  };
}
module.exports = { createHarness, loadSource };
