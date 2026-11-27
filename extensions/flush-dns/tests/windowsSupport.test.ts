import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { createWindowsDnsFlusher } from "../src/windowsSupport.ts";

const IPCONFIG = "C:\\Windows\\System32\\ipconfig.exe";
const POWERSHELL = "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";

function commandFailure(code: number | string, stderr = "") {
  return Object.assign(new Error("Command failed"), { code, stdout: "", stderr });
}

describe("createWindowsDnsFlusher", () => {
  test("flushes without elevation when ipconfig succeeds", async () => {
    const calls: Array<{ executable: string; args: readonly string[] }> = [];
    const flush = createWindowsDnsFlusher({
      systemRoot: "C:\\Windows",
      execute: async (executable, args) => {
        calls.push({ executable, args });
      },
    });

    await flush();

    assert.deepEqual(calls, [{ executable: IPCONFIG, args: ["/flushdns"] }]);
  });

  test("retries through an elevated PowerShell process when ipconfig exits with an error", async () => {
    const calls: Array<{ executable: string; args: readonly string[]; timeout?: number }> = [];
    const flush = createWindowsDnsFlusher({
      systemRoot: "C:\\Windows",
      execute: async (executable, args, timeout) => {
        calls.push({ executable, args, timeout });
        if (executable === IPCONFIG) throw commandFailure(1);
      },
    });

    await flush();

    assert.equal(calls.length, 2);
    assert.equal(calls[1].executable, POWERSHELL);
    assert.equal(calls[1].timeout, 60_000);
    assert.deepEqual(calls[1].args.slice(0, 3), ["-NoProfile", "-NonInteractive", "-Command"]);
    assert.match(calls[1].args[3], /Start-Process .*ipconfig\.exe.* -ArgumentList '\/flushdns' -Verb RunAs/);
    assert.match(calls[1].args[3], /exit \$process\.ExitCode/);
  });

  test("does not ask for elevation when ipconfig cannot be started", async () => {
    const calls: string[] = [];
    const spawnError = commandFailure("ENOENT");
    const flush = createWindowsDnsFlusher({
      systemRoot: "C:\\Windows",
      execute: async (executable) => {
        calls.push(executable);
        throw spawnError;
      },
    });

    await assert.rejects(flush(), spawnError);
    assert.deepEqual(calls, [IPCONFIG]);
  });

  test("passes on the reason when the UAC prompt is cancelled", async () => {
    const cancelled = commandFailure(1, "Start-Process : This command cannot be run due to the error: The operation was canceled by the user.");
    const flush = createWindowsDnsFlusher({
      systemRoot: "C:\\Windows",
      execute: async (executable) => {
        throw executable === IPCONFIG ? commandFailure(1) : cancelled;
      },
    });

    await assert.rejects(flush(), cancelled);
  });

  test("reports the exit code when the elevated ipconfig fails", async () => {
    const flush = createWindowsDnsFlusher({
      systemRoot: "C:\\Windows",
      execute: async () => {
        throw commandFailure(1);
      },
    });

    await assert.rejects(flush(), { message: "ipconfig /flushdns failed as administrator (exit code 1)" });
  });
});
