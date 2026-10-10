import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { test } from "node:test";
import { promisify } from "node:util";

import { pickBookDownloadDirectory } from "../src/utils/folder-picker";

const execute = promisify(execFile);
const nativeOptions = { skip: process.platform !== "darwin" };
const runWithSelection = async (script: string, selection: string): Promise<string> => {
  const simulated = script.replace(/set outputFolder to choose folder with prompt "[^"]*"/, selection);
  assert.notEqual(simulated, script, "replace the selection before executing so no folder dialog can open");
  const { stdout } = await execute("/usr/bin/osascript", ["-e", simulated]);
  return stdout;
};

test("AppleScript folder cancellation returns no directory instead of throwing", nativeOptions, async () => {
  const directory = await pickBookDownloadDirectory((script) => runWithSelection(script, "error number -128"));
  assert.equal(directory, undefined);
});

test("folder selection preserves spaces and returns the chosen POSIX path", nativeOptions, async () => {
  const directory = await pickBookDownloadDirectory((script) =>
    runWithSelection(script, 'set outputFolder to POSIX file "/tmp/Books With Spaces/"'),
  );
  assert.equal(directory, "/tmp/Books With Spaces/");
});

test("other AppleScript errors propagate instead of being treated as cancellation", nativeOptions, async () => {
  await assert.rejects(
    pickBookDownloadDirectory((script) => runWithSelection(script, 'error "Picker failed" number -1728')),
    /Picker failed.*\(-1728\)/,
  );
});

test("script runner failures propagate and an empty cancellation result cannot select a default directory", async () => {
  const failure = new Error("Could not start osascript");
  await assert.rejects(
    pickBookDownloadDirectory(async () => {
      throw failure;
    }),
    (error) => error === failure,
  );
  assert.equal(await pickBookDownloadDirectory(async () => "\n"), undefined);
});
