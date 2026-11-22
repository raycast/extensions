const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function transport(reply, error = null) {
  const calls = [];
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, "../src/windows-automation.ts"), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 },
  }).outputText;
  vm.runInNewContext(source, {
    exports,
    Buffer,
    Error,
    process: { env: { SystemRoot: "C:\\Windows" } },
    require(name) {
      if (name === "@raycast/api") return { environment: { assetsPath: "C:\\Extension With Spaces\\assets" } };
      if (name === "path") return path.win32;
      if (name === "child_process")
        return {
          execFile: (exe, args, options, callback) => {
            calls.push({ exe, args, options });
            callback(error, reply);
          },
        };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return { ...exports, calls };
}

test("PowerShell arguments preserve arbitrary text as data, with hidden window and timeout", async () => {
  const h = transport('{"ok":true,"result":true}');
  const space = "Work'; $(Write-Output injected) \"\n日本語";
  assert.equal(await h.runWindowsAutomation("switch-space", { space }), true);
  const call = h.calls[0];
  assert.equal(call.exe, "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe");
  assert.equal(call.args[call.args.indexOf("-File") + 1], "C:\\Extension With Spaces\\assets\\windows-automation.ps1");
  assert.deepEqual(JSON.parse(Buffer.from(call.args.at(-1), "base64").toString("utf8")), {
    space,
    operation: "switch-space",
  });
  assert.equal(call.options.windowsHide, true);
  assert.equal(call.options.timeout, 15000);
  assert.equal(call.options.shell, undefined);
  assert.equal(call.args.includes("-ExecutionPolicy"), false);
});

test("helper errors remain actionable even when PowerShell exits nonzero", async () => {
  const h = transport('{"ok":false,"error":"TAB_NOT_FOUND: Refresh the tab list."}', new Error("exit 1"));
  await assert.rejects(() => h.runWindowsAutomation("close-tab"), /TAB_NOT_FOUND/);
});

test("timeouts and blocked scripts report distinct errors", async () => {
  await assert.rejects(() => transport("", { killed: true }).runWindowsAutomation("tabs"), /timed out/);
  await assert.rejects(() => transport("", new Error("policy")).runWindowsAutomation("tabs"), /script policy/);
});

test("malformed helper output cannot be mistaken for successful automation", async () => {
  await assert.rejects(() => transport("not JSON").runWindowsAutomation("tabs"), /Could not run/);
});
