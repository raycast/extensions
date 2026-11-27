import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { createWindowsDnsFlusher, ELEVATED_FLUSH_SCRIPT } from "../src/windowsSupport.ts";

const IPCONFIG = "C:\\Windows\\System32\\ipconfig.exe";

function commandFailure(code: number | string, stderr = "") {
  return Object.assign(new Error("Command failed"), { code, stdout: "", stderr });
}

function powerShellFailure(exitCode: number, stderr = "") {
  return Object.assign(new Error("Command failed with exit code 1: powershell.exe"), { exitCode, stdout: "", stderr });
}

function createFlusher(options: {
  execute?: (executable: string, args: readonly string[]) => Promise<void>;
  runPowerShell?: (script: string, timeout: number) => Promise<void>;
}) {
  return createWindowsDnsFlusher({
    systemRoot: "C:\\Windows",
    execute: options.execute ?? (async () => {}),
    runPowerShell: options.runPowerShell ?? (async () => {}),
  });
}

describe("createWindowsDnsFlusher", () => {
  test("flushes without elevation when ipconfig succeeds", async () => {
    const calls: Array<{ executable: string; args: readonly string[] }> = [];
    let elevated = false;
    const flush = createFlusher({
      execute: async (executable, args) => {
        calls.push({ executable, args });
      },
      runPowerShell: async () => {
        elevated = true;
      },
    });

    await flush();

    assert.deepEqual(calls, [{ executable: IPCONFIG, args: ["/flushdns"] }]);
    assert.equal(elevated, false);
  });

  test("retries through an elevated PowerShell script when ipconfig exits with an error", async () => {
    const scripts: Array<{ script: string; timeout: number }> = [];
    const flush = createFlusher({
      execute: async () => {
        throw commandFailure(1);
      },
      runPowerShell: async (script, timeout) => {
        scripts.push({ script, timeout });
      },
    });

    await flush();

    assert.deepEqual(scripts, [{ script: ELEVATED_FLUSH_SCRIPT, timeout: 60_000 }]);
    assert.match(ELEVATED_FLUSH_SCRIPT, /\$info\.Verb = 'runas'/);
    assert.match(ELEVATED_FLUSH_SCRIPT, /System32\\ipconfig\.exe/);
    assert.match(ELEVATED_FLUSH_SCRIPT, /exit \$process\.ExitCode/);
  });

  test("ends every multi-line block with a blank line so PowerShell runs it from stdin", () => {
    const lines = ELEVATED_FLUSH_SCRIPT.split("\n");

    lines.forEach((line, index) => {
      if (line === "}") {
        assert.equal(lines[index + 1], "", `line ${index + 1} closes a block without a following blank line`);
      }
    });
  });

  test("does not ask for elevation when ipconfig cannot be started", async () => {
    const spawnError = commandFailure("ENOENT");
    let elevated = false;
    const flush = createFlusher({
      execute: async () => {
        throw spawnError;
      },
      runPowerShell: async () => {
        elevated = true;
      },
    });

    await assert.rejects(flush(), spawnError);
    assert.equal(elevated, false);
  });

  test("passes on the reason when the UAC prompt is cancelled", async () => {
    const cancelled = powerShellFailure(1, "The operation was canceled by the user");
    const flush = createFlusher({
      execute: async () => {
        throw commandFailure(1);
      },
      runPowerShell: async () => {
        throw cancelled;
      },
    });

    await assert.rejects(flush(), cancelled);
  });

  test("reports the exit code when the elevated ipconfig fails", async () => {
    const flush = createFlusher({
      execute: async () => {
        throw commandFailure(1);
      },
      runPowerShell: async () => {
        throw powerShellFailure(1);
      },
    });

    await assert.rejects(flush(), { message: "ipconfig /flushdns failed as administrator (exit code 1)" });
  });
});
