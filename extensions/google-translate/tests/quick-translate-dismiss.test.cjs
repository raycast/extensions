const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

const source = readFileSync(path.join(__dirname, "../src/QuickTranslate/useResetOnDismiss.ts"), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;

function mount(platform = "darwin") {
  const watcher = new EventEmitter();
  watcher.stdout = new EventEmitter();
  watcher.stdout.setEncoding = () => {};
  watcher.stderr = new EventEmitter();
  let cleanup;
  let killed = false;
  let spawned = false;
  const resets = [];
  watcher.kill = () => {
    killed = true;
  };
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    process: { platform, pid: 999 },
    console: { error() {} },
    require(name) {
      if (name === "@raycast/api")
        return {
          environment: { assetsPath: "/extension/assets" },
          popToRoot: (options) => {
            resets.push(options);
            return Promise.resolve();
          },
        };
      if (name === "react")
        return {
          useEffect: (effect) => {
            cleanup = effect();
          },
        };
      if (name === "node:path") return path;
      if (name === "node:child_process")
        return {
          spawn: (executable, args) => {
            assert.equal(executable, "/usr/bin/osascript");
            assert.deepEqual(Array.from(args), [
              "-l",
              "JavaScript",
              "/extension/assets/watch-quick-translate-window.js",
              "999",
            ]);
            spawned = true;
            return watcher;
          },
        };
      throw new Error(name);
    },
  });
  exports.useResetOnDismiss();
  return { watcher, resets, cleanup, spawned, killed: () => killed };
}

test("dismissal clears root search once, including when output arrives in chunks", () => {
  const instance = mount();
  instance.watcher.stdout.emit("data", "clo");
  assert.equal(instance.resets.length, 0);
  instance.watcher.stdout.emit("data", "sed\n");
  instance.watcher.stdout.emit("data", "closed\n");
  assert.equal(instance.resets.length, 1);
  assert.equal(instance.resets[0].clearSearchBar, true);
});

test("ESC/unmount kills the child and late events cannot reset the next command", () => {
  const instance = mount();
  instance.cleanup();
  instance.watcher.stdout.emit("data", "closed\n");
  assert.equal(instance.killed(), true);
  assert.equal(instance.resets.length, 0);
});

test("watcher failures leave a visible command usable", () => {
  const instance = mount();
  instance.watcher.emit("error", new Error("cannot spawn"));
  assert.equal(instance.resets.length, 0);
  instance.cleanup();
});

test("Windows never launches the macOS helper", () => {
  assert.equal(mount("win32").spawned, false);
});
