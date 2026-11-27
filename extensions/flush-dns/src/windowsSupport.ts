export interface WindowsFlushDependencies {
  systemRoot: string;
  execute(executable: string, args: readonly string[]): Promise<void>;
  runPowerShell(script: string, timeout: number): Promise<void>;
}

const ELEVATION_TIMEOUT = 60_000;

// Process.Start is used instead of Start-Process because its failure keeps the Win32 reason as the innermost
// exception, so a cancelled UAC prompt reports just "The operation was canceled by the user" on stderr.
export const ELEVATED_FLUSH_SCRIPT = `
$info = New-Object System.Diagnostics.ProcessStartInfo
$info.FileName = Join-Path $env:SystemRoot 'System32\\ipconfig.exe'
$info.Arguments = '/flushdns'
$info.Verb = 'runas'
$info.UseShellExecute = $true
$info.WindowStyle = 'Hidden'
try {
  $process = [System.Diagnostics.Process]::Start($info)
} catch {
  $reason = $_.Exception
  while ($reason.InnerException) { $reason = $reason.InnerException }
  [Console]::Error.WriteLine($reason.Message)
  exit 1
}
$process.WaitForExit()
exit $process.ExitCode
`;

function exitCodeOf(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  if ("exitCode" in error && typeof error.exitCode === "number") return error.exitCode;
  if ("code" in error && typeof error.code === "number") return error.code;
  return undefined;
}

function hasStderr(error: unknown): boolean {
  return typeof error === "object" && error !== null && "stderr" in error && String(error.stderr ?? "").trim() !== "";
}

export function createWindowsDnsFlusher(dependencies: WindowsFlushDependencies) {
  const ipconfig = `${dependencies.systemRoot}\\System32\\ipconfig.exe`;

  return async function flushWindowsDns(): Promise<void> {
    try {
      await dependencies.execute(ipconfig, ["/flushdns"]);
      return;
    } catch (error) {
      // Spawn errors (such as ENOENT) have no exit code and would fail the same way when elevated.
      if (exitCodeOf(error) === undefined) throw error;

      // Newer Windows builds refuse to flush the cache without elevation, and the error text is localized,
      // so any non-zero exit gets one retry through a UAC prompt.
      console.log("🔐 ipconfig /flushdns failed without elevation, retrying as administrator:", error);
    }

    try {
      await dependencies.runPowerShell(ELEVATED_FLUSH_SCRIPT, ELEVATION_TIMEOUT);
    } catch (error) {
      // A cancelled UAC prompt reports its reason on stderr. The elevated ipconfig has no output we can read,
      // so a failure there only has its exit code.
      const exitCode = exitCodeOf(error);
      if (exitCode !== undefined && !hasStderr(error)) {
        throw new Error(`ipconfig /flushdns failed as administrator (exit code ${exitCode})`);
      }

      throw error;
    }
  };
}
