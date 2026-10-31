require("./load.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const childProcess = require("node:child_process");
const Module = require("node:module");
const ts = require("typescript");
const { CLI_DEFINITIONS } = require("../src/cli-detection.ts");
const { connectionSignature, parseSetup } = require("../src/setup-state.ts");
const { storageKeys } = require("../src/session-storage.ts");
const { setLanguage } = require("../src/i18n.ts");

// Only Raycast's native host is replaced. Factory and all three production
// client implementations execute as shipped; resolver/OS spies stop I/O.
function factory() {
  const filename = path.resolve(__dirname, "../src/provider.ts");
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.require = (id) =>
    id === "@raycast/api"
      ? {
          LocalStorage: {
            getItem: async () => undefined,
            setItem: async () => undefined,
          },
        }
      : require(path.resolve(path.dirname(filename), id + ".ts"));
  const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
    },
    fileName: filename,
  }).outputText;
  loaded._compile(source, filename);
  return loaded.exports.createProviderClient;
}

const createProviderClient = factory();
const codexExecutable = require("../src/executable.ts");
const cliExecutable = require("../src/cli-executable.ts");
const options = { onEvent() {}, sandbox: "read-only", liveSearch: false };

function spies(t) {
  const original = {
    codex: codexExecutable.resolveCodexExecutable,
    cli: cliExecutable.resolveCliExecutable,
    access: fs.accessSync,
    spawn: childProcess.spawn,
    execFile: childProcess.execFile,
  };
  const calls = { resolvers: [], files: [], launches: [] };
  codexExecutable.resolveCodexExecutable = async (explicit) => {
    calls.resolvers.push(["codex", explicit]);
    throw new Error("resolver reached");
  };
  cliExecutable.resolveCliExecutable = async (provider, explicit) => {
    calls.resolvers.push([provider, explicit]);
    throw new Error("resolver reached");
  };
  fs.accessSync = (file, ...args) => {
    calls.files.push(file);
    return original.access(file, ...args);
  };
  childProcess.spawn = (...args) => {
    calls.launches.push(["spawn", ...args]);
    throw new Error("unexpected subprocess");
  };
  childProcess.execFile = (...args) => {
    calls.launches.push(["execFile", ...args]);
    throw new Error("unexpected subprocess");
  };
  t.after(() => {
    codexExecutable.resolveCodexExecutable = original.codex;
    cliExecutable.resolveCliExecutable = original.cli;
    fs.accessSync = original.access;
    childProcess.spawn = original.spawn;
    childProcess.execFile = original.execFile;
  });
  return calls;
}

for (const entry of CLI_DEFINITIONS) {
  test(`${entry.label}: disabled detection rejects missing or blank manual paths before resolver or launch`, async (t) => {
    const calls = spies(t);
    for (const missing of [undefined, "", "  \t "]) {
      const client = createProviderClient(entry.id, {
        ...options,
        autoDetectCli: false,
        [entry.preference]: missing,
      });
      await assert.rejects(
        client.connect(),
        /Automatic CLI detection is off.*path in preferences/,
      );
      client.close();
    }
    assert.deepEqual(calls, { resolvers: [], files: [], launches: [] });
  });

  test(`${entry.label}: explicit path permits the production connection when automatic detection is off`, async (t) => {
    const calls = spies(t);
    const client = createProviderClient(entry.id, {
      ...options,
      autoDetectCli: false,
      [entry.preference]: process.execPath,
    });
    if (entry.id === "antigravity") {
      // AGY's resolver is intentionally private to its adapter. A real existing
      // native file proves its file resolver was reached, without executing it.
      await client.connect();
      assert.ok(calls.files.includes(process.execPath));
    } else {
      await assert.rejects(client.connect(), /resolver reached/);
      assert.deepEqual(calls.resolvers, [[entry.id, process.execPath]]);
    }
    assert.deepEqual(calls.launches, []);
    client.close();
  });
}

test("automatic discovery remains enabled by default and when explicitly selected", async (t) => {
  const calls = spies(t);
  for (const autoDetectCli of [undefined, true]) {
    const client = createProviderClient("qoder", { ...options, autoDetectCli });
    await assert.rejects(client.connect(), /resolver reached/);
    client.close();
  }
  assert.deepEqual(calls.resolvers, [
    ["qoder", undefined],
    ["qoder", undefined],
  ]);
  assert.deepEqual(calls.launches, []);
});

test("disabled-detection guidance follows the UI language while actual resolver diagnostics remain untouched", async (t) => {
  const calls = spies(t);
  t.after(() => setLanguage("en"));
  for (const language of ["zh-CN", "zh-TW"]) {
    setLanguage(language);
    for (const entry of CLI_DEFINITIONS) {
      const client = createProviderClient(entry.id, {
        ...options,
        autoDetectCli: false,
      });
      const expected =
        language === "zh-CN"
          ? `自动检测已关闭，请在偏好设置中填写 ${entry.label} CLI 的路径。`
          : `自動偵測已關閉，請在偏好設定中填寫 ${entry.label} CLI 的路徑。`;
      await assert.rejects(client.connect(), { message: expected });
      client.close();
    }
    const client = createProviderClient("qoder", { ...options });
    await assert.rejects(client.connect(), { message: "resolver reached" });
    client.close();
  }
  assert.deepEqual(calls.resolvers, [
    ["qoder", undefined],
    ["qoder", undefined],
  ]);
  assert.deepEqual(calls.files, []);
  assert.deepEqual(calls.launches, []);
});

test("language changes preserve legacy setup signatures, model choice, and provider storage identity", () => {
  for (const entry of CLI_DEFINITIONS) {
    const base = { [entry.preference]: "/configured/cli" };
    const signature = connectionSignature(base, entry.id);
    const saved = JSON.stringify({
      version: 2,
      selection: { model: "retained-model", effort: "" },
      connection: signature,
      checkedAt: 123,
    });
    const originalKeys = storageKeys(entry.id);
    for (const uiLanguage of ["en", "zh-CN", "zh-TW"]) {
      const changed = Object.freeze({
        ...base,
        autoDetectCli: true,
        uiLanguage,
      });
      assert.equal(connectionSignature(changed, entry.id), signature);
      assert.equal(
        parseSetup(saved).connection,
        connectionSignature(changed, entry.id),
      );
      assert.deepEqual(parseSetup(saved).selection, {
        model: "retained-model",
        effort: "",
      });
      assert.deepEqual(storageKeys(entry.id), originalKeys);
    }
    assert.notEqual(
      connectionSignature({ ...base, autoDetectCli: false }, entry.id),
      signature,
    );
    assert.notEqual(
      connectionSignature(
        { ...base, [entry.preference]: "/different/cli" },
        entry.id,
      ),
      signature,
    );
  }
  assert.equal(connectionSignature({}), '["","","read-only",true]');
  assert.equal(
    connectionSignature({}, "antigravity"),
    '["antigravity","","","read-only"]',
  );
});
