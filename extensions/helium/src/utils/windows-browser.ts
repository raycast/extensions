import { runPowerShellScript } from "@raycast/utils";
import { spawn } from "child_process";
import { existsSync } from "fs";
import { getWindowsUserDataPath, requireHeliumExecutable } from "./platform";

/**
 * Windows counterpart to `applescript.ts`.
 *
 * Chromium on Windows has no scripting interface, so everything here goes
 * through the executable's command line. Arguments are passed as an array so
 * URLs never need shell quoting, and the child is detached and unref'd so
 * Helium outlives the Raycast command process.
 *
 * Reading tab state, switching tabs, and closing tabs are not expressible this
 * way — those are handled by the Browser Extension (read-only) in `browser.ts`.
 */
function launchHelium(args: string[]): void {
  const executable = requireHeliumExecutable();
  const child = spawn(executable, [...getProfileArgs(), ...args], {
    detached: true,
    stdio: "ignore",
    windowsHide: false,
  });
  child.unref();
}

/**
 * Pin the profile explicitly instead of letting Chromium derive it.
 *
 * Raycast's extension processes run with `LOCALAPPDATA` set to
 * `AppData\Local\Temp`, and Chromium builds its default user data directory
 * from that variable. A child process inheriting the environment therefore
 * starts against a brand new profile under Temp — new-user onboarding, none of
 * the user's history, bookmarks or sessions — and silently leaves that stray
 * profile behind.
 *
 * Passing the directory we already resolved for reading keeps the profile the
 * extension reads and the profile Helium opens in agreement. The flag is
 * omitted when the path cannot be confirmed on disk, so a bad guess can never
 * force Helium onto the wrong profile.
 */
function getProfileArgs(): string[] {
  const userDataDir = getWindowsUserDataPath();
  return userDataDir && existsSync(userDataDir) ? [`--user-data-dir=${userDataDir}`] : [];
}

/**
 * Helium's new tab page. Chromium accepts it on the command line, so a new
 * window lands on the real new tab page — with the search box and shortcuts —
 * rather than a blank document.
 */
const NEW_TAB_PAGE = "chrome://new-tab-page/";

/**
 * Open a URL in Helium. Chromium reuses the most recently focused window and
 * appends a new tab, and starts Helium first when it isn't running.
 */
export async function openUrlInHelium(url: string): Promise<void> {
  launchHelium([url]);
}

/**
 * Open a new tab on Helium's new tab page, in the window the user last used.
 *
 * Chromium's command line cannot express this. Measured against a running
 * Helium: ordinary web URLs and `about:blank` are appended as a tab to the
 * last-used window, but `chrome://` addresses, an unrecognised `--new-tab`, and
 * a bare launch all open a *new window* instead. So the command line offers
 * either the right placement (a tab, with a blank page) or the right content
 * (the new tab page, in a new window) — never both.
 *
 * Focusing Helium and sending Ctrl+T gets both, at the cost of depending on
 * window focus. Every step is checked, and anything unexpected — Helium not
 * running, no browser window, focus refused — falls back to the command line
 * rather than firing a keystroke at whatever happens to be focused.
 */
export async function createNewTab(): Promise<void> {
  if (await tryNewTabViaKeystroke()) return;
  launchHelium([NEW_TAB_PAGE]);
}

/**
 * Returns true only if Helium was genuinely focused and the keystroke sent.
 *
 * Window lookup matches on the owning process's executable path rather than the
 * window title: Chrome, Edge and every other Chromium browser share the
 * `Chrome_WidgetWin_1` window class, so class alone would target the wrong
 * browser. `AttachThreadInput` is the standard workaround for Windows'
 * foreground lock, which otherwise refuses focus changes from a background
 * process, and the result is verified before any input is synthesised.
 */
async function tryNewTabViaKeystroke(): Promise<boolean> {
  const executable = requireHeliumExecutable();

  const script = `
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -TypeDefinition @"
    using System;
    using System.Runtime.InteropServices;
    using System.Text;
    public class HeliumWindows {
      public delegate bool EnumProc(IntPtr hWnd, IntPtr lParam);
      [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr lParam);
      [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
      [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr hWnd, StringBuilder s, int max);
      [DllImport("user32.dll")] public static extern int GetWindowTextLength(IntPtr hWnd);
      [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
      [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
      [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
      [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int cmd);
      [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint from, uint to, bool attach);
      [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();

      // EnumWindows walks top-level windows in Z-order, so the first match is
      // the browser window the user looked at most recently.
      public static IntPtr FindTopWindow(uint[] pids) {
        IntPtr result = IntPtr.Zero;
        EnumWindows((hWnd, lParam) => {
          if (!IsWindowVisible(hWnd)) return true;
          StringBuilder cls = new StringBuilder(64);
          GetClassName(hWnd, cls, 64);
          if (cls.ToString() != "Chrome_WidgetWin_1") return true;
          if (GetWindowTextLength(hWnd) == 0) return true;
          uint pid;
          GetWindowThreadProcessId(hWnd, out pid);
          foreach (uint candidate in pids) {
            if (candidate == pid) { result = hWnd; return false; }
          }
          return true;
        }, IntPtr.Zero);
        return result;
      }

      public static void Focus(IntPtr hWnd) {
        ShowWindow(hWnd, 9); // SW_RESTORE
        uint foregroundPid;
        uint foregroundThread = GetWindowThreadProcessId(GetForegroundWindow(), out foregroundPid);
        uint self = GetCurrentThreadId();
        AttachThreadInput(self, foregroundThread, true);
        SetForegroundWindow(hWnd);
        AttachThreadInput(self, foregroundThread, false);
      }
    }
"@

    $executable = '${escapeForPowerShellSingleQuotes(executable)}'
    $processIds = @(Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $executable } | ForEach-Object { [uint32]$_.Id })
    if ($processIds.Count -eq 0) { 'not-running'; exit }

    $window = [HeliumWindows]::FindTopWindow([uint32[]]$processIds)
    if ($window -eq [IntPtr]::Zero) { 'no-window'; exit }

    [HeliumWindows]::Focus($window)
    Start-Sleep -Milliseconds 150
    if ([HeliumWindows]::GetForegroundWindow() -ne $window) { 'not-focused'; exit }

    [System.Windows.Forms.SendKeys]::SendWait('^t')
    'ok'
  `;

  try {
    const result = await runPowerShellScript(script, { timeout: 5000 });
    return result.trim().endsWith("ok");
  } catch (error) {
    console.error("[Helium] New tab keystroke failed, falling back to command line:", error);
    return false;
  }
}

function escapeForPowerShellSingleQuotes(value: string): string {
  return value.replace(/'/g, "''");
}

/** Open a new window on the new tab page. */
export async function createNewWindow(): Promise<void> {
  launchHelium(["--new-window", NEW_TAB_PAGE]);
}

/** Open an incognito window. */
export async function createNewIncognitoWindow(): Promise<void> {
  launchHelium(["--incognito"]);
}
