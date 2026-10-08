// ─────────────────────────────────────────────────────────────────────
// service-restart.test.mjs — tests for the restart decision logic.
//
// Tests verify WHICH launchctl command is chosen and WHEN refusal
// happens, without any real launchctl/plutil calls. Uses node:test.
// Run: node --test src/lib/service-restart.test.mjs
// ─────────────────────────────────────────────────────────────────────
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { runServiceRestart } from "./service-restart.mjs";

/** Build a fake exec that records calls and returns empty string. */
function makeRecordingExec() {
  const calls = [];
  const exec = (cmd, args, opts) => {
    calls.push({ cmd, args, opts });
    return "";
  };
  exec.calls = calls;
  return exec;
}

const STANDALONE_LABEL = "com.mitchelljphayes.switcheroo";
const HOMEBREW_LABEL = "homebrew.mxcl.switcheroo";
const STANDALONE_EXEC =
  "/Users/test/.local/bin/Switcheroo.app/Contents/MacOS/switcheroo";
const HOMEBREW_EXEC =
  "/opt/homebrew/opt/switcheroo/Switcheroo.app/Contents/MacOS/switcheroo";
const STANDALONE_PLIST_PATH =
  "/Users/test/Library/LaunchAgents/com.mitchelljphayes.switcheroo.plist";

describe("runServiceRestart — standalone loaded (graceful SIGTERM, not kickstart)", () => {
  test("uses kill SIGTERM for loaded standalone service (not kickstart -k)", () => {
    const exec = makeRecordingExec();
    const result = runServiceRestart({
      detectLayout: () => ({
        layout: "standalone",
        label: STANDALONE_LABEL,
        executable: STANDALONE_EXEC,
      }),
      plistIsStandalone: () => true,
      plistKeepAlive: () => true,
      getLoadedProgram: () => STANDALONE_EXEC,
      getHomebrewExec: () => null,
      getUid: () => "501",
      getStandalonePlistPath: () => STANDALONE_PLIST_PATH,
      exec,
    });

    assert.equal(result.command, "kill");
    assert.deepEqual(result.args, [
      "kill",
      "SIGTERM",
      `gui/501/${STANDALONE_LABEL}`,
    ]);
    assert.equal(exec.calls.length, 1);
    assert.equal(exec.calls[0].cmd, "/bin/launchctl");
    assert.equal(exec.calls[0].args[0], "kill");
    assert.equal(exec.calls[0].args[1], "SIGTERM");
  });

  test("does NOT call bootout for loaded standalone", () => {
    const exec = makeRecordingExec();
    runServiceRestart({
      detectLayout: () => ({
        layout: "standalone",
        label: STANDALONE_LABEL,
        executable: STANDALONE_EXEC,
      }),
      plistIsStandalone: () => true,
      plistKeepAlive: () => true,
      getLoadedProgram: () => STANDALONE_EXEC,
      getHomebrewExec: () => null,
      getUid: () => "501",
      getStandalonePlistPath: () => STANDALONE_PLIST_PATH,
      exec,
    });

    const commands = exec.calls.map((c) => c.args[0]);
    assert.ok(!commands.includes("bootout"), "bootout must not be called");
  });

  test("does NOT call kickstart -k for loaded standalone (graceful instead)", () => {
    const exec = makeRecordingExec();
    runServiceRestart({
      detectLayout: () => ({
        layout: "standalone",
        label: STANDALONE_LABEL,
        executable: STANDALONE_EXEC,
      }),
      plistIsStandalone: () => true,
      plistKeepAlive: () => true,
      getLoadedProgram: () => STANDALONE_EXEC,
      getHomebrewExec: () => null,
      getUid: () => "501",
      getStandalonePlistPath: () => STANDALONE_PLIST_PATH,
      exec,
    });

    const commands = exec.calls.map((c) => c.args[0]);
    assert.ok(
      !commands.includes("kickstart"),
      "kickstart must not be used for loaded standalone (graceful kill instead)",
    );
  });

  test("does NOT call bootstrap for loaded standalone", () => {
    const exec = makeRecordingExec();
    runServiceRestart({
      detectLayout: () => ({
        layout: "standalone",
        label: STANDALONE_LABEL,
        executable: STANDALONE_EXEC,
      }),
      plistIsStandalone: () => true,
      plistKeepAlive: () => true,
      getLoadedProgram: () => STANDALONE_EXEC,
      getHomebrewExec: () => null,
      getUid: () => "501",
      getStandalonePlistPath: () => STANDALONE_PLIST_PATH,
      exec,
    });

    const commands = exec.calls.map((c) => c.args[0]);
    assert.ok(
      !commands.includes("bootstrap"),
      "bootstrap must not be called for loaded service",
    );
  });

  test("refuses restart if standalone plist identity check fails", () => {
    const exec = makeRecordingExec();
    assert.throws(
      () =>
        runServiceRestart({
          detectLayout: () => ({
            layout: "standalone",
            label: STANDALONE_LABEL,
            executable: STANDALONE_EXEC,
          }),
          plistIsStandalone: () => false,
          plistKeepAlive: () => true,
          getLoadedProgram: () => STANDALONE_EXEC,
          getHomebrewExec: () => null,
          getUid: () => "501",
          getStandalonePlistPath: () => STANDALONE_PLIST_PATH,
          exec,
        }),
      /plist validation failed/,
    );
    assert.equal(exec.calls.length, 0);
  });

  test("refuses restart if KeepAlive is false/missing", () => {
    const exec = makeRecordingExec();
    assert.throws(
      () =>
        runServiceRestart({
          detectLayout: () => ({
            layout: "standalone",
            label: STANDALONE_LABEL,
            executable: STANDALONE_EXEC,
          }),
          plistIsStandalone: () => true,
          plistKeepAlive: () => false,
          getLoadedProgram: () => STANDALONE_EXEC,
          getHomebrewExec: () => null,
          getUid: () => "501",
          getStandalonePlistPath: () => STANDALONE_PLIST_PATH,
          exec,
        }),
      /KeepAlive/,
    );
    assert.equal(exec.calls.length, 0);
  });

  test("refuses if loaded program changed (TOCTOU recheck before kill)", () => {
    const exec = makeRecordingExec();
    assert.throws(
      () =>
        runServiceRestart({
          detectLayout: () => ({
            layout: "standalone",
            label: STANDALONE_LABEL,
            executable: STANDALONE_EXEC,
          }),
          plistIsStandalone: () => true,
          plistKeepAlive: () => true,
          // Program changed between detectLayout and kill
          getLoadedProgram: () => "/some/other/path",
          getHomebrewExec: () => null,
          getUid: () => "501",
          getStandalonePlistPath: () => STANDALONE_PLIST_PATH,
          exec,
        }),
      /TOCTOU/,
    );
    assert.equal(exec.calls.length, 0);
  });

  test("calls exactly one launchctl command for loaded standalone", () => {
    const exec = makeRecordingExec();
    runServiceRestart({
      detectLayout: () => ({
        layout: "standalone",
        label: STANDALONE_LABEL,
        executable: STANDALONE_EXEC,
      }),
      plistIsStandalone: () => true,
      plistKeepAlive: () => true,
      getLoadedProgram: () => STANDALONE_EXEC,
      getHomebrewExec: () => null,
      getUid: () => "501",
      getStandalonePlistPath: () => STANDALONE_PLIST_PATH,
      exec,
    });
    assert.equal(exec.calls.length, 1, "exactly one launchctl call");
  });

  test("result message says 'Restart requested' not 'completed'", () => {
    const exec = makeRecordingExec();
    const result = runServiceRestart({
      detectLayout: () => ({
        layout: "standalone",
        label: STANDALONE_LABEL,
        executable: STANDALONE_EXEC,
      }),
      plistIsStandalone: () => true,
      plistKeepAlive: () => true,
      getLoadedProgram: () => STANDALONE_EXEC,
      getHomebrewExec: () => null,
      getUid: () => "501",
      getStandalonePlistPath: () => STANDALONE_PLIST_PATH,
      exec,
    });
    assert.match(result.message, /Restart requested/);
    assert.match(result.message, /graceful SIGTERM/);
  });
});

describe("runServiceRestart — standalone absent (bootstrap with exact path)", () => {
  test("uses bootstrap with exact plist path when absent and plist valid", () => {
    const exec = makeRecordingExec();
    const result = runServiceRestart({
      detectLayout: () => null,
      plistIsStandalone: () => true,
      plistKeepAlive: () => true,
      getLoadedProgram: () => null,
      getHomebrewExec: () => null,
      getUid: () => "501",
      getStandalonePlistPath: () => STANDALONE_PLIST_PATH,
      exec,
    });

    assert.equal(result.command, "bootstrap");
    assert.equal(result.args[0], "bootstrap");
    assert.equal(exec.calls.length, 1);
    assert.equal(exec.calls[0].args[0], "bootstrap");
    // The EXACT plist path must be in the args, not a placeholder
    assert.equal(exec.calls[0].args[2], STANDALONE_PLIST_PATH);
  });

  test("bootstrap args contain real path, not <plist-path> placeholder", () => {
    const exec = makeRecordingExec();
    const result = runServiceRestart({
      detectLayout: () => null,
      plistIsStandalone: () => true,
      plistKeepAlive: () => true,
      getLoadedProgram: () => null,
      getHomebrewExec: () => null,
      getUid: () => "501",
      getStandalonePlistPath: () => STANDALONE_PLIST_PATH,
      exec,
    });

    assert.ok(
      !result.args.includes("<plist-path>"),
      "args must not contain placeholder",
    );
    assert.ok(
      result.args.some((a) =>
        a.includes("com.mitchelljphayes.switcheroo.plist"),
      ),
      "args must contain real plist path",
    );
  });

  test("refuses placeholder/sentinel plist path", () => {
    const exec = makeRecordingExec();
    assert.throws(
      () =>
        runServiceRestart({
          detectLayout: () => null,
          plistIsStandalone: () => true,
          plistKeepAlive: () => true,
          getLoadedProgram: () => null,
          getHomebrewExec: () => null,
          getUid: () => "501",
          getStandalonePlistPath: () => "<plist-path>",
          exec,
        }),
      /placeholder|absolute/i,
    );
    assert.equal(exec.calls.length, 0);
  });

  test("does NOT use kickstart for absent service", () => {
    const exec = makeRecordingExec();
    runServiceRestart({
      detectLayout: () => null,
      plistIsStandalone: () => true,
      plistKeepAlive: () => true,
      getLoadedProgram: () => null,
      getHomebrewExec: () => null,
      getUid: () => "501",
      getStandalonePlistPath: () => STANDALONE_PLIST_PATH,
      exec,
    });

    const commands = exec.calls.map((c) => c.args[0]);
    assert.ok(
      !commands.includes("kickstart"),
      "kickstart must not be used for absent service",
    );
  });

  test("throws with Homebrew hint when absent and Homebrew is installed", () => {
    const exec = makeRecordingExec();
    assert.throws(
      () =>
        runServiceRestart({
          detectLayout: () => null,
          plistIsStandalone: () => false,
          plistKeepAlive: () => false,
          getLoadedProgram: () => null,
          getHomebrewExec: () => HOMEBREW_EXEC,
          getUid: () => "501",
          getStandalonePlistPath: () => STANDALONE_PLIST_PATH,
          exec,
        }),
      /brew services start/,
    );
    assert.equal(exec.calls.length, 0);
  });

  test("throws with install hint when absent and nothing installed", () => {
    const exec = makeRecordingExec();
    assert.throws(
      () =>
        runServiceRestart({
          detectLayout: () => null,
          plistIsStandalone: () => false,
          plistKeepAlive: () => false,
          getLoadedProgram: () => null,
          getHomebrewExec: () => null,
          getUid: () => "501",
          getStandalonePlistPath: () => STANDALONE_PLIST_PATH,
          exec,
        }),
      /not installed or not running/,
    );
    assert.equal(exec.calls.length, 0);
  });
});

describe("runServiceRestart — Homebrew loaded (unchanged: identity-verified kickstart)", () => {
  test("uses kickstart -k for loaded Homebrew service (pre-existing, unchanged)", () => {
    const exec = makeRecordingExec();
    const result = runServiceRestart({
      detectLayout: () => ({
        layout: "homebrew",
        label: HOMEBREW_LABEL,
        executable: HOMEBREW_EXEC,
      }),
      plistIsStandalone: () => false,
      plistKeepAlive: () => false,
      getLoadedProgram: () => HOMEBREW_EXEC,
      getHomebrewExec: () => HOMEBREW_EXEC,
      getUid: () => "501",
      getStandalonePlistPath: () => STANDALONE_PLIST_PATH,
      exec,
    });

    assert.equal(result.command, "kickstart");
    assert.deepEqual(result.args, [
      "kickstart",
      "-k",
      `gui/501/${HOMEBREW_LABEL}`,
    ]);
    assert.equal(exec.calls.length, 1);
  });

  test("refuses kickstart if loaded program changed (TOCTOU)", () => {
    const exec = makeRecordingExec();
    assert.throws(
      () =>
        runServiceRestart({
          detectLayout: () => ({
            layout: "homebrew",
            label: HOMEBREW_LABEL,
            executable: HOMEBREW_EXEC,
          }),
          plistIsStandalone: () => false,
          plistKeepAlive: () => false,
          getLoadedProgram: () => "/some/other/path",
          getHomebrewExec: () => HOMEBREW_EXEC,
          getUid: () => "501",
          getStandalonePlistPath: () => STANDALONE_PLIST_PATH,
          exec,
        }),
      /TOCTOU/,
    );
    assert.equal(exec.calls.length, 0);
  });
});
