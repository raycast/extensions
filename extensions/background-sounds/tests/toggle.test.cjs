const assert = require("node:assert/strict");
const { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { test, mock } = require("node:test");
const { runInNewContext } = require("node:vm");
const ts = require("typescript");

function loadToggle() {
  let appleScript;
  const api = { showHUD: mock.fn(async () => {}) };
  const utils = {
    runAppleScript: mock.fn(async (script) => {
      appleScript = script;
      return true;
    }),
  };
  const source = readFileSync(path.join(__dirname, "..", "src", "toggle.ts"), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 },
  });
  const exports = {};
  runInNewContext(outputText, {
    exports,
    require(name) {
      if (name === "@raycast/api") return api;
      if (name === "@raycast/utils") return utils;
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  return {
    api,
    async run() {
      await exports.default();
      return appleScript;
    },
  };
}

// `do shell script` runs the payload with /bin/sh and raises an AppleScript
// error whenever it exits non-zero, so every embedded shell payload must
// tolerate a non-zero exit from a command that only signals readiness.
function shellPayloads(appleScript) {
  return [...appleScript.matchAll(/do shell script "([^"]*)"/g)].map((match) => match[1]);
}

function stubBin() {
  const dir = mkdtempSync(path.join(tmpdir(), "bg-sounds-"));
  for (const name of ["defaults", "date"]) {
    const file = path.join(dir, name);
    writeFileSync(file, "#!/bin/sh\nexit 0\n");
    chmodSync(file, 0o755);
  }
  const killall = path.join(dir, "killall");
  writeFileSync(
    killall,
    "#!/bin/sh\necho 'No matching processes belonging to you were found' >&2\nexit 1\n",
  );
  chmodSync(killall, 0o755);
  return {
    dir,
    restore() {
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

test("tells Raycast the command succeeded", async () => {
  const { run, api } = loadToggle();
  await run();
  assert.equal(api.showHUD.mock.callCount(), 1);
  assert.equal(api.showHUD.mock.calls[0].arguments[0], "Background sound toggled");
});

test("every shell payload succeeds even when the heard daemon is not running", async () => {
  const { run } = loadToggle();
  const appleScript = await run();
  const payloads = shellPayloads(appleScript);
  assert.ok(payloads.some((payload) => payload.includes("killall")), "expected a killall payload");
  const bin = stubBin();
  try {
    for (const payload of payloads) {
      assert.doesNotThrow(
        () => execFileSync("/bin/sh", ["-c", payload], { env: { PATH: bin.dir } }),
        `payload failed when heard is not running: ${payload}`,
      );
    }
  } finally {
    bin.restore();
  }
});
