const assert = require("node:assert/strict");
const { test } = require("node:test");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function loadPlatform(platform, present = [], env = {}) {
  const paths = platform === "win32" ? path.win32 : path.posix;
  const home = platform === "win32" ? "C:\\Users\\Test User" : "/Users/test";
  const source = ts.transpileModule(readFileSync(path.join(__dirname, "../src/platform.ts"), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(source, {
    exports,
    process: { platform, env },
    require(name) {
      if (name === "path") return paths;
      if (name === "os") return { homedir: () => home };
      if (name === "fs") return { existsSync: (file) => present.includes(file) };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return exports;
}

const local = "D:\\Local Data";
const packaged = path.win32.join(
  local,
  "Packages",
  "TheBrowserCompany.Dia_ttt1ap7aakyb4",
  "LocalCache",
  "Local",
  "Dia",
  "User Data",
);
const unpackaged = path.win32.join(local, "Dia", "User Data");

test("Windows prefers packaged browser data when both installations exist", () => {
  const api = loadPlatform(
    "win32",
    [path.win32.join(packaged, "Local State"), path.win32.join(unpackaged, "Local State")],
    { LOCALAPPDATA: local },
  );
  assert.equal(api.getUserDataPath(), packaged);
  assert.equal(api.DIA_APPLICATION, "TheBrowserCompany.Dia_ttt1ap7aakyb4!Dia");
  assert.throws(() => api.requireMacAutomation(), /not supported.*Windows/);
});

test("Windows falls back to unpackaged data only when it contains Local State", () => {
  const api = loadPlatform("win32", [path.win32.join(unpackaged, "Local State")], { LOCALAPPDATA: local });
  assert.equal(api.getUserDataPath(), unpackaged);
});

test("missing LOCALAPPDATA uses the user's home directory", () => {
  const api = loadPlatform("win32");
  assert.equal(
    api.getUserDataPath(),
    path.win32.join(
      "C:\\Users\\Test User",
      "AppData",
      "Local",
      "Packages",
      api.DIA_PACKAGE_FAMILY,
      "LocalCache",
      "Local",
      "Dia",
      "User Data",
    ),
  );
});

test("macOS retains its data path, app ID, and automation", () => {
  const api = loadPlatform("darwin");
  assert.equal(api.getUserDataPath(), "/Users/test/Library/Application Support/Dia/User Data");
  assert.equal(api.DIA_APPLICATION, "company.thebrowser.dia");
  assert.doesNotThrow(() => api.requireMacAutomation());
});
