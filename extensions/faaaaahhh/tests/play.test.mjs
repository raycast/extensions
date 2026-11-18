import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { beforeEach, mock, test } from "node:test";
import { setImmediate } from "node:timers/promises";
import { compileFunction } from "node:vm";
import ts from "typescript";

const assetsPath = "/tmp/Raycast assets 'quoted'; not-a-shell-command";
const closeMainWindow = mock.fn(async () => {});
const showHUD = mock.fn(async () => {});
let finishPlayback;
const execFile = mock.fn((_file, _args, callback) => {
  finishPlayback = callback;
});

const source = readFileSync(new URL("../src/play.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2023,
  },
});
const require = createRequire(import.meta.url);
const commandExports = {};
compileFunction(outputText, ["require", "exports"])((specifier) => {
  if (specifier === "@raycast/api") {
    return { closeMainWindow, environment: { assetsPath }, showHUD };
  }
  if (specifier === "node:child_process") return { execFile };
  return require(specifier);
}, commandExports);

const Command = commandExports.default;

beforeEach(() => {
  closeMainWindow.mock.resetCalls();
  showHUD.mock.resetCalls();
  execFile.mock.resetCalls();
  finishPlayback = undefined;
});

test("closes Raycast, plays the bundled sound without a shell, and waits for completion", async () => {
  let completed = false;
  const command = Command().then(() => {
    completed = true;
  });
  await setImmediate();

  assert.equal(closeMainWindow.mock.callCount(), 1);
  assert.equal(execFile.mock.callCount(), 1);
  assert.equal(execFile.mock.calls[0].arguments[0], "/usr/bin/afplay");
  assert.deepEqual(execFile.mock.calls[0].arguments[1], [
    `${assetsPath}/faaaaahhh.m4a`,
  ]);
  assert.equal(completed, false);

  finishPlayback(null, "", "");
  await command;

  assert.equal(completed, true);
  assert.equal(showHUD.mock.callCount(), 0);
});

test("reports playback failures in a HUD and preserves diagnostics in logs", async (t) => {
  const log = t.mock.method(console, "error", () => {});
  const command = Command();
  await setImmediate();

  const error = new Error("Audio file could not be opened");
  finishPlayback(error, "", "");
  await command;

  assert.equal(showHUD.mock.callCount(), 1);
  assert.match(showHUD.mock.calls[0].arguments[0], /Could not play Faaaaahhh/);
  assert.equal(log.mock.calls[0].arguments[1], error);
});
