import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";

interface WindowsFlushDependencies {
  systemRoot: string;
  execute(executable: string, args: readonly string[], timeout?: number): Promise<void>;
}

const ELEVATION_TIMEOUT = 60_000;
const ELEVATED_FLUSH_SCRIPT = [
  "$ErrorActionPreference = 'Stop'",
  "$process = Start-Process -FilePath (Join-Path $env:SystemRoot 'System32\\ipconfig.exe') -ArgumentList '/flushdns' -Verb RunAs -WindowStyle Hidden -Wait -PassThru",
  "exit $process.ExitCode",
].join("; ");

const execFile = promisify(execFileCallback);

function isExitCodeFailure(error: unknown): error is { code: number } {
  return typeof error === "object" && error !== null && "code" in error && typeof error.code === "number";
}

function hasStderr(error: object): boolean {
  return "stderr" in error && String(error.stderr ?? "").trim() !== "";
}

export function createWindowsDnsFlusher(dependencies: WindowsFlushDependencies) {
  const ipconfig = `${dependencies.systemRoot}\\System32\\ipconfig.exe`;
  const powershell = `${dependencies.systemRoot}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`;

  return async function flushWindowsDns(): Promise<void> {
    try {
      await dependencies.execute(ipconfig, ["/flushdns"]);
      return;
    } catch (error) {
      // Spawn errors (such as ENOENT) have a string code and would fail the same way when elevated.
      if (!isExitCodeFailure(error)) throw error;

      // Newer Windows builds refuse to flush the cache without elevation, and the error text is localized,
      // so any non-zero exit gets one retry through a UAC prompt.
      console.log("🔐 ipconfig /flushdns failed without elevation, retrying as administrator:", error);
    }

    try {
      await dependencies.execute(
        powershell,
        ["-NoProfile", "-NonInteractive", "-Command", ELEVATED_FLUSH_SCRIPT],
        ELEVATION_TIMEOUT,
      );
    } catch (error) {
      // A cancelled UAC prompt reports its reason on stderr. The elevated ipconfig has no output we can read,
      // so a failure there only has its exit code.
      if (isExitCodeFailure(error) && !hasStderr(error)) {
        throw new Error(`ipconfig /flushdns failed as administrator (exit code ${error.code})`);
      }

      throw error;
    }
  };
}

export const flushWindowsDns = createWindowsDnsFlusher({
  systemRoot: process.env.SystemRoot ?? "C:\\Windows",
  execute: async (executable, args, timeout) => {
    await execFile(executable, [...args], { timeout, windowsHide: true });
  },
});
