import { environment } from "@raycast/api";
import { execFile, execFileSync, ExecFileException } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

let cachedScriptPath: string | null = null;
let cachedIconPath: string | null = null;

export function getStateDirectory(): string {
  const base = environment.supportPath || path.join(os.tmpdir(), "raycast-caffeine");
  if (!fs.existsSync(base)) {
    fs.mkdirSync(base, { recursive: true });
  }
  return base;
}

export function cleanFile(filePath: string | undefined): void {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    // Ignore cleanup error
  }
}

export function escapePsArg(arg: string): string {
  return arg.replace(/'/g, "''").replace(/"/g, '`"');
}

export function getHelperScriptPath(): string {
  if (cachedScriptPath && fs.existsSync(cachedScriptPath)) {
    return cachedScriptPath;
  }

  const candidates: string[] = [];

  if (environment.assetsPath) {
    candidates.push(path.join(environment.assetsPath, "scripts", "caffeine-helper.ps1"));
    candidates.push(path.join(environment.assetsPath, "caffeine-helper.ps1"));
  }

  candidates.push(path.join(__dirname, "..", "..", "assets", "scripts", "caffeine-helper.ps1"));
  candidates.push(path.join(__dirname, "..", "assets", "scripts", "caffeine-helper.ps1"));
  candidates.push(path.join(process.cwd(), "assets", "scripts", "caffeine-helper.ps1"));

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      cachedScriptPath = candidate;
      return candidate;
    }
  }

  throw new Error("Caffeine PowerShell helper script not found in extension assets.");
}

export function getIconPath(): string | null {
  if (cachedIconPath && fs.existsSync(cachedIconPath)) {
    return cachedIconPath;
  }

  const candidates: string[] = [];

  if (environment.assetsPath) {
    candidates.push(path.join(environment.assetsPath, "icon.png"));
  }

  candidates.push(path.join(__dirname, "..", "..", "assets", "icon.png"));
  candidates.push(path.join(__dirname, "..", "assets", "icon.png"));
  candidates.push(path.join(process.cwd(), "assets", "icon.png"));

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      cachedIconPath = candidate;
      return candidate;
    }
  }

  return null;
}

/**
 * Verifies if a PID is alive and belongs to the Caffeine helper.
 * Uses helper-owned status file and non-blocking process.kill(pid, 0).
 */
export function isPidAlive(pid: number | undefined, processStartTime?: number, statusFilePath?: string): boolean {
  if (!pid || typeof pid !== "number" || isNaN(pid) || pid <= 0 || pid === process.pid) {
    return false;
  }

  if (statusFilePath && !fs.existsSync(statusFilePath)) {
    return false;
  }

  try {
    process.kill(pid, 0);
  } catch {
    return false;
  }

  return true;
}

export type HelperVerificationResult =
  | { status: "verified" }
  | { status: "not_running" }
  | { status: "mismatch"; reason: string }
  | { status: "lookup_failed"; error: Error };

export type VerifierFunction = (
  pid: number,
  expectedStartTime?: number,
  timeoutMs?: number,
) => Promise<HelperVerificationResult>;

let customVerifier: VerifierFunction | null = null;

export function setCustomVerifier(verifier: VerifierFunction | null): void {
  customVerifier = verifier;
}

/**
 * Thoroughly verifies the process identity and creation time before terminating or replacing it.
 * Distinguishes between confirmed identity mismatches vs lookup failures/timeouts.
 */
export function verifyHelperIdentity(
  pid: number,
  expectedStartTime?: number,
  timeoutMs = 4000,
): Promise<HelperVerificationResult> {
  if (customVerifier) {
    return customVerifier(pid, expectedStartTime, timeoutMs);
  }

  return new Promise((resolve) => {
    if (!pid || typeof pid !== "number" || isNaN(pid) || pid <= 0) {
      resolve({ status: "not_running" });
      return;
    }

    try {
      process.kill(pid, 0);
    } catch {
      resolve({ status: "not_running" });
      return;
    }

    const safePid = Math.floor(pid);
    const safeExpectedStart = expectedStartTime && expectedStartTime > 0 ? Math.floor(expectedStartTime) : 0;

    const checkCmd = `
$TargetPid = ${safePid}
$ExpectedStart = ${safeExpectedStart}
try {
    $proc = [System.Diagnostics.Process]::GetProcessById($TargetPid)
    if ($proc.ProcessName -notlike '*powershell*' -and $proc.ProcessName -notlike '*pwsh*') {
        exit 2
    }
    if ($ExpectedStart -gt 0) {
        $procStartMs = [DateTimeOffset]::new($proc.StartTime.ToUniversalTime()).ToUnixTimeMilliseconds()
        if ([Math]::Abs($procStartMs - $ExpectedStart) -gt 3000) {
            exit 3
        }
    }
    $cim = Get-CimInstance Win32_Process -Filter "ProcessId = $TargetPid" -ErrorAction SilentlyContinue
    if (-not $cim -or $cim.CommandLine -notlike '*caffeine-helper*') {
        exit 4
    }
    exit 0
} catch {
    exit 1
}
`;

    execFile(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", checkCmd],
      {
        windowsHide: true,
        timeout: timeoutMs,
      },
      (error: ExecFileException | null) => {
        if (!error) {
          resolve({ status: "verified" });
          return;
        }

        // Check if timeout occurred
        if (error.killed || error.signal === "SIGTERM" || error.code === "ETIMEDOUT") {
          resolve({
            status: "lookup_failed",
            error: new Error(`Helper identity lookup timed out after ${timeoutMs}ms`),
          });
          return;
        }

        // Check exit codes from PowerShell
        if (typeof error.code === "number") {
          if (error.code === 1) {
            resolve({ status: "not_running" });
            return;
          }
          if (error.code === 2) {
            resolve({ status: "mismatch", reason: "Process name is not PowerShell" });
            return;
          }
          if (error.code === 3) {
            resolve({ status: "mismatch", reason: "Process creation time does not match expected session" });
            return;
          }
          if (error.code === 4) {
            resolve({ status: "mismatch", reason: "Process command line does not match caffeine-helper" });
            return;
          }
        }

        // Any other execution error
        resolve({
          status: "lookup_failed",
          error: error instanceof Error ? error : new Error(String(error)),
        });
      },
    );
  });
}

export interface LaunchHelperResult {
  pid: number;
  processStartTime: number;
  statusFilePath: string;
}

/**
 * Launches the background Caffeine PowerShell helper using Windows native Start-Process.
 * Waits for a confirmed ready signal from the helper before returning.
 * If SetThreadExecutionState fails or the helper terminates during startup, throws an error.
 */
export async function launchHelperProcess(
  durationSeconds: number,
  preventDisplaySleep: boolean,
): Promise<LaunchHelperResult> {
  const scriptPath = getHelperScriptPath();
  const iconPath = getIconPath();
  const safeDuration = Math.max(0, Math.floor(durationSeconds));
  const safeDisplayFlag = preventDisplaySleep ? "1" : "0";

  const sessionId = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const readyFilePath = path.join(getStateDirectory(), `caffeine_ready_${sessionId}.json`);
  const statusFilePath = path.join(getStateDirectory(), `caffeine_status_${sessionId}.json`);

  cleanFile(readyFilePath);
  cleanFile(statusFilePath);

  const safeScriptPath = escapePsArg(scriptPath);
  const safeReadyFilePath = escapePsArg(readyFilePath);
  const safeStatusFilePath = escapePsArg(statusFilePath);

  const psArgs = [
    "'-NoProfile'",
    "'-NonInteractive'",
    "'-WindowStyle'",
    "'Hidden'",
    "'-ExecutionPolicy'",
    "'Bypass'",
    "'-File'",
    `'"${safeScriptPath}"'`,
    "'-DurationSeconds'",
    `'${safeDuration}'`,
    "'-PreventDisplaySleep'",
    `'${safeDisplayFlag}'`,
    "'-ReadyFile'",
    `'"${safeReadyFilePath}"'`,
    "'-StatusFile'",
    `'"${safeStatusFilePath}"'`,
  ];

  if (iconPath) {
    const safeIconPath = escapePsArg(iconPath);
    psArgs.push("'-IconPath'", `'"${safeIconPath}"'`);
  }

  const psCommand = `Start-Process powershell.exe -ArgumentList @(${psArgs.join(",")}) -WindowStyle Hidden -PassThru | Select-Object -ExpandProperty Id`;

  const output = execFileSync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", psCommand],
    {
      windowsHide: true,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    },
  );

  const initialPid = parseInt(output.trim(), 10);
  if (isNaN(initialPid) || initialPid <= 0) {
    cleanFile(readyFilePath);
    cleanFile(statusFilePath);
    throw new Error("Failed to obtain a valid process ID for the Caffeine background helper.");
  }

  // Asynchronously wait for ready signal from helper
  const startTime = Date.now();
  const timeoutMs = 5000;
  let readyData: { pid: number; startTime: number } | null = null;

  while (Date.now() - startTime < timeoutMs) {
    if (fs.existsSync(readyFilePath)) {
      try {
        const raw = fs.readFileSync(readyFilePath, "utf8");
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.pid === "number") {
          readyData = {
            pid: parsed.pid,
            startTime: typeof parsed.startTime === "number" ? parsed.startTime : Date.now(),
          };
          break;
        }
      } catch {
        // Retry reading
      }
    }

    // Verify child process hasn't exited during initialization (e.g. SetThreadExecutionState returned 0)
    try {
      process.kill(initialPid, 0);
    } catch {
      cleanFile(readyFilePath);
      cleanFile(statusFilePath);
      throw new Error(
        "Caffeine helper failed during startup: SetThreadExecutionState failed or helper process terminated.",
      );
    }

    await new Promise((r) => setTimeout(r, 50));
  }

  cleanFile(readyFilePath);

  if (!readyData) {
    try {
      process.kill(initialPid);
    } catch {
      // Process may already have exited
    }
    cleanFile(statusFilePath);
    throw new Error("Timed out waiting for Caffeine helper to initialize.");
  }

  return {
    pid: readyData.pid,
    processStartTime: readyData.startTime,
    statusFilePath,
  };
}

/**
 * Safely and gracefully terminates the background helper process by PID.
 * Verifies helper identity and creation time before sending signals or killing.
 * If identity check fails or times out, throws an error and preserves state.
 */
export async function terminateHelperProcess(
  pid: number | undefined,
  processStartTime?: number,
  statusFilePath?: string,
): Promise<void> {
  if (!pid || typeof pid !== "number" || isNaN(pid) || pid <= 0 || pid === process.pid) {
    return;
  }

  try {
    process.kill(pid, 0);
  } catch {
    // Process does not exist in the OS
    if (statusFilePath) cleanFile(statusFilePath);
    return;
  }

  // Verify identity and creation time before terminating to protect unrelated processes
  const verification = await verifyHelperIdentity(pid, processStartTime);

  if (verification.status === "not_running") {
    if (statusFilePath) cleanFile(statusFilePath);
    return;
  }

  if (verification.status === "mismatch") {
    // PID was reused by an unrelated process. Clean state and do not kill the unrelated process!
    if (statusFilePath) cleanFile(statusFilePath);
    return;
  }

  if (verification.status === "lookup_failed") {
    // Identity verification timed out or failed.
    // Do NOT delete status file, do NOT clear saved PID; report failure to caller!
    throw new Error(
      `Unable to verify helper process identity (${verification.error.message}). Saved session preserved; please retry stopping Caffeine.`,
    );
  }

  // Verification status is "verified" - proceed with graceful stop
  try {
    const stopCmd = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class TrayRefresher {
    [DllImport("user32.dll", SetLastError = true)]
    static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
    [DllImport("user32.dll", SetLastError = true)]
    static extern IntPtr FindWindowEx(IntPtr parentHandle, IntPtr childAfter, string className, string windowTitle);
    [DllImport("user32.dll")]
    static extern bool GetClientRect(IntPtr hWnd, out RECT lpRect);
    [DllImport("user32.dll")]
    static extern IntPtr SendMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);
    [StructLayout(LayoutKind.Sequential)]
    public struct RECT { public int Left, Top, Right, Bottom; }
    const uint WM_MOUSEMOVE = 0x0200;
    public static void Refresh() {
        IntPtr tray = FindWindow("Shell_TrayWnd", null);
        if (tray != IntPtr.Zero) {
            IntPtr notify = FindWindowEx(tray, IntPtr.Zero, "TrayNotifyWnd", null);
            if (notify != IntPtr.Zero) {
                IntPtr pager = FindWindowEx(notify, IntPtr.Zero, "SysPager", null);
                IntPtr tb = pager != IntPtr.Zero ? FindWindowEx(pager, IntPtr.Zero, "ToolbarWindow32", null) : FindWindowEx(notify, IntPtr.Zero, "ToolbarWindow32", null);
                if (tb != IntPtr.Zero) RefreshTb(tb);
            }
        }
        IntPtr overflow = FindWindow("NotifyIconOverflowWindow", null);
        if (overflow != IntPtr.Zero) {
            IntPtr tb = FindWindowEx(overflow, IntPtr.Zero, "ToolbarWindow32", null);
            if (tb != IntPtr.Zero) RefreshTb(tb);
        }
    }
    private static void RefreshTb(IntPtr tb) {
        RECT r;
        if (GetClientRect(tb, out r)) {
            for (int x = 0; x < r.Right; x += 8) {
                for (int y = 0; y < r.Bottom; y += 8) {
                    SendMessage(tb, WM_MOUSEMOVE, IntPtr.Zero, (IntPtr)((y << 16) | (x & 0xFFFF)));
                }
            }
        }
    }
}
"@
try {
    $e = [System.Threading.EventWaitHandle]::OpenExisting('Local\\Caffeine_Stop_${pid}')
    $e.Set() | Out-Null
    $e.Close()
} catch {}
Start-Sleep -Milliseconds 150
[TrayRefresher]::Refresh()
`;

    await new Promise<void>((resolve) => {
      execFile(
        "powershell.exe",
        ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", stopCmd],
        {
          windowsHide: true,
          timeout: 3000,
        },
        () => resolve(),
      );
    });
  } catch {
    // Ignore stop event signaling error
  }

  // Fallback: If still running after grace period, re-verify and terminate
  try {
    process.kill(pid, 0);
    const recheck = await verifyHelperIdentity(pid, processStartTime);
    if (recheck.status === "verified") {
      execFileSync("taskkill", ["/PID", String(pid), "/F", "/T"], {
        windowsHide: true,
        stdio: "ignore",
      });
    }
  } catch {
    // Process already exited
  }

  if (statusFilePath) {
    cleanFile(statusFilePath);
  }
}
