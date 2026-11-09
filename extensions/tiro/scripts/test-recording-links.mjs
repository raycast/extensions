import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import ts from "typescript";
const source = readFileSync(new URL("../src/lib/recording-links.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { RECORDING_ACTIONS, recordingUrl } = await import(
  "data:text/javascript;base64," + Buffer.from(js).toString("base64")
);
const routes = [
  "notes/create/live-voice",
  "notes/end/live-voice",
  "notes/create/offline-mode",
  "notes/end/offline-mode",
];
assert.equal(RECORDING_ACTIONS.length, routes.length);
RECORDING_ACTIONS.forEach((action, i) => assert.equal(recordingUrl(action), `tiro://${routes[i]}?background=true`));
console.log("4 canonical recording routes passed");

// A URL's background query only controls the receiver. The OS launch itself must not activate it.
const { default: vm } = await import("node:vm");
const { promisify } = await import("node:util");
const recordingSource = readFileSync(new URL("../src/lib/recording.ts", import.meta.url), "utf8");
const recordingJs = ts.transpileModule(recordingSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
for (const action of RECORDING_ACTIONS) {
  const calls = [];
  const notices = [];
  let shouldFail = false;
  const api = {
    closeMainWindow: async () => {},
    showToast: async (toast) => notices.push(toast),
    Toast: { Style: { Success: "success", Failure: "failure" } },
  };
  const mod = { exports: {} };
  vm.runInNewContext(recordingJs, {
    module: mod,
    exports: mod.exports,
    require: (name) => {
      if (name === "@raycast/api") return api;
      if (name === "./recording-links") return { recordingUrl };
      if (name === "node:util") return { promisify };
      if (name === "node:child_process")
        return {
          execFile(file, args, callback) {
            calls.push({ file, args: Array.from(args) });
            callback(shouldFail ? new Error("launch failed") : null, "", "");
          },
        };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  await mod.exports.requestRecording(action);
  assert.deepEqual(calls, [{ file: "/usr/bin/open", args: ["-g", recordingUrl(action)] }]);
  assert.equal(notices.at(-1).title, "Request sent to Tiro");
  shouldFail = true;
  await mod.exports.requestRecording(action);
  assert.equal(calls.length, 2); // One attempt per request, no activating fallback.
  assert.equal(notices.at(-1).style, "failure");
}
console.log("4 non-activating launch + failure regression cases passed");
