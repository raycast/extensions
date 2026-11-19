import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { OPEN_PATH, OSASCRIPT_PATH } from "../src/lib/exec.ts";
import type { ExecFileRunner } from "../src/lib/exec.ts";
import { LIST_APPS_SCRIPT, TERMINATE_APP_SCRIPT } from "../src/lib/jxa.ts";
import {
  isProcessRunning,
  listRunningApps,
  openBundle,
  parseRunningApps,
  parseTerminateOutcome,
  terminateApp,
} from "../src/lib/macos.ts";
import type { RestartableApp } from "../src/lib/types.ts";

const app: RestartableApp = {
  pid: 321,
  name: "Weird; $(App)",
  bundleId: "com.example.weird",
  bundlePath: "/Applications/Weird; $(rm -rf ~) 'App'.app",
  executablePath: "/Applications/Weird; $(rm -rf ~) 'App'.app/Contents/MacOS/Weird",
  kind: "regular",
};

function recordingExec(stdout: string) {
  const calls: { file: string; args: readonly string[] }[] = [];
  const exec: ExecFileRunner = async (file, args) => {
    calls.push({ file, args });
    return { stdout, stderr: "" };
  };
  return { exec, calls };
}

describe("osascript and open argument vectors", () => {
  it("lists apps with JXA through the absolute osascript path", async () => {
    const { exec, calls } = recordingExec(
      JSON.stringify([
        { pid: 1, name: "A", bundleId: "a", bundlePath: "/A.app", executablePath: "/A.app/x", activationPolicy: 0 },
      ]),
    );
    const apps = await listRunningApps(exec);
    assert.equal(apps.length, 1);
    assert.deepEqual(calls, [{ file: OSASCRIPT_PATH, args: ["-l", "JavaScript", "-e", LIST_APPS_SCRIPT] }]);
  });

  it("passes PID, exact paths and mode as separate argv entries, never interpolated", async () => {
    const { exec, calls } = recordingExec('{"status":"requested"}');
    assert.deepEqual(await terminateApp(app, "force", exec), { status: "requested" });
    assert.deepEqual(calls[0], {
      file: OSASCRIPT_PATH,
      args: ["-l", "JavaScript", "-e", TERMINATE_APP_SCRIPT, "321", app.bundlePath, app.executablePath, "force"],
    });
    assert.ok(!TERMINATE_APP_SCRIPT.includes(app.bundlePath));
  });

  it("reopens the exact bundle with /usr/bin/open", async () => {
    const { exec, calls } = recordingExec("");
    await openBundle(app.bundlePath, false, exec);
    await openBundle(app.bundlePath, true, exec);
    assert.deepEqual(calls, [
      { file: OPEN_PATH, args: ["-a", app.bundlePath] },
      { file: OPEN_PATH, args: ["-n", "-a", app.bundlePath] },
    ]);
  });
});

describe("parsers", () => {
  it("drops malformed snapshot entries and normalizes empty strings", () => {
    const apps = parseRunningApps(
      JSON.stringify([
        null,
        { name: "no pid" },
        { pid: 5, name: "", bundleId: "x", bundlePath: "/X.app", executablePath: null, activationPolicy: 1 },
      ]),
    );
    assert.deepEqual(apps, [
      {
        pid: 5,
        name: null,
        bundleId: "x",
        bundlePath: "/X.app",
        executablePath: null,
        activationPolicy: 1,
        terminated: false,
      },
    ]);
    assert.throws(() => parseRunningApps("{}"));
  });

  it("parses terminate outcomes and rejects unknown ones", () => {
    assert.deepEqual(parseTerminateOutcome('{"status":"refused"}'), { status: "refused" });
    assert.deepEqual(parseTerminateOutcome('{"status":"stale","detail":"gone"}'), { status: "stale", detail: "gone" });
    assert.throws(() => parseTerminateOutcome('{"status":"maybe"}'));
  });
});

describe("isProcessRunning", () => {
  it("detects the current process and a missing PID", () => {
    assert.equal(isProcessRunning(process.pid), true);
    assert.equal(isProcessRunning(2 ** 22 + 12345), false);
  });
});
