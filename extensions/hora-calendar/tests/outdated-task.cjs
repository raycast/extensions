const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function load(file, mocks) {
  const source = fs.readFileSync(path.join(__dirname, "../src", file), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require: (name) => {
      assert.ok(name in mocks, `Unexpected import: ${name}`);
      return mocks[name];
    },
  });
  return exports;
}

(async () => {
  let writes = 0;
  let toast;
  let opened;
  const lists = [
    { id: "one", name: "Tasks", accountEmail: "one@example.com" },
    { id: "two", name: "Tasks", accountEmail: "two@example.com" },
  ];
  const hora = load("hora.ts", {
    "@raycast/api": { getApplications: async () => [{ bundleId: "szamowski.Hora-direct" }] },
    "@raycast/utils": {
      runAppleScript: async (script) => {
        if (script.includes("with list ID")) throw new Error("syntax error (-2741)");
        if (script.includes("list task lists")) return JSON.stringify(lists);
        writes++;
        return "{}";
      },
    },
  });
  const download = "https://horacal.app/download/direct/";
  const feedback = load("feedback.ts", {
    "./hora": hora,
    "./hora-required": { HORA_DIRECT_DOWNLOAD: download, HOMEBREW_INSTALL_COMMAND: "brew install hora" },
    "@raycast/api": {
      Toast: { Style: { Failure: "failure" } },
      showToast: async (value) => (toast = value),
      open: (url) => (opened = url),
      Clipboard: { copy: () => {} },
    },
  });
  try {
    await hora.addTask({ title: "Invoice", listID: "one", listName: "Tasks", accountEmail: "one@example.com" });
    assert.fail("Ambiguous task list must reject");
  } catch (error) {
    assert.ok(error instanceof hora.HoraOutdatedError);
    await feedback.showFailure(error);
    assert.equal(toast.message, error.message);
    assert.match(toast.message, /account-specific task lists/);
    toast.primaryAction.onAction();
    assert.equal(opened, download);
    assert.equal(writes, 0);
  }
  await feedback.showFailure(new hora.HoraOutdatedError());
  assert.match(toast.message, /cannot be scripted/);
  assert.ok(toast.primaryAction);
  console.log("PASS: outdated task keeps its explanation and download action without writing");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
