import { runPowerShellScript } from "@raycast/utils";
import { spawn } from "child_process";
import { existsSync } from "fs";
import { getWindowsUserDataPath, requireHeliumExecutable } from "./platform";

/**
 * Windows counterpart to `applescript.ts`.
 *
 * Chromium on Windows has no scripting interface, so this module reaches Helium
 * two ways: its command line for launching, and the Windows accessibility tree
 * for the one thing the command line cannot express — acting on a tab that is
 * already open.
 *
 * Reading tab state still comes from the Browser Extension (see `browser.ts`);
 * closing tabs remains unsupported.
 */
/**
 * Launch Helium detached, resolving once the process is actually running.
 *
 * The `error` event must be handled: it fires asynchronously, and an unhandled
 * one on a ChildProcess is re-thrown as an uncaught exception that no caller's
 * try/catch can reach — a stale cached path or a bad `heliumPath` preference
 * would crash the command instead of showing a toast. Awaiting `spawn` also
 * means failures surface before `closeMainWindow()` hides them.
 */
function launchHelium(args: string[]): Promise<void> {
  const executable = requireHeliumExecutable();

  return new Promise((resolve, reject) => {
    const child = spawn(executable, [...getProfileArgs(), ...args], {
      detached: true,
      stdio: "ignore",
      windowsHide: false,
    });

    child.once("error", (error) => reject(new Error(`Could not start Helium at ${executable}: ${error.message}`)));
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });
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
 * Helium's new tab page. Chromium accepts it on the command line, but only ever
 * in a *new window* — see {@link createNewTab}.
 */
const NEW_TAB_PAGE = "chrome://new-tab-page/";

/**
 * Shared PowerShell preamble: locate Helium's browser windows and raise one.
 *
 * Windows are matched by the owning process's executable path rather than by
 * title, because Chrome, Edge and every other Chromium browser share the
 * `Chrome_WidgetWin_1` window class and would otherwise match. `EnumWindows`
 * walks top-level windows in Z-order, so the first hit is the window the user
 * looked at most recently.
 *
 * `AttachThreadInput` is the standard workaround for Windows' foreground lock,
 * which otherwise refuses focus changes coming from a background process.
 */
const WINDOW_HELPER_SOURCE = `
  Add-Type -TypeDefinition @"
  using System;
  using System.Collections.Generic;
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

    public static List<IntPtr> All(uint[] pids) {
      List<IntPtr> found = new List<IntPtr>();
      EnumWindows((hWnd, lParam) => {
        if (!IsWindowVisible(hWnd)) return true;
        StringBuilder cls = new StringBuilder(64);
        GetClassName(hWnd, cls, 64);
        if (cls.ToString() != "Chrome_WidgetWin_1") return true;
        if (GetWindowTextLength(hWnd) == 0) return true;
        uint pid;
        GetWindowThreadProcessId(hWnd, out pid);
        foreach (uint candidate in pids) {
          if (candidate == pid) { found.Add(hWnd); break; }
        }
        return true;
      }, IntPtr.Zero);
      return found;
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
`;

/** PowerShell that resolves Helium's process ids into `$processIds`. */
function heliumProcessLookup(executable: string): string {
  return `
    $executable = '${escapeForPowerShellSingleQuotes(executable)}'
    $processIds = @(Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $executable } | ForEach-Object { [uint32]$_.Id })
    if ($processIds.Count -eq 0) { 'not-running'; exit }
  `;
}

function escapeForPowerShellSingleQuotes(value: string): string {
  return value.replace(/'/g, "''");
}

/**
 * Run a Helium automation script and report the outcome.
 *
 * Each script prints a single status word. Anything other than `ok` is logged
 * with the stage it stopped at (`not-running`, `no-window`, `no-match`,
 * `not-focused`), because these paths fall back silently and would otherwise be
 * undiagnosable from a bug report.
 */
async function runHeliumScript(action: string, script: string): Promise<string> {
  try {
    const result = (await runPowerShellScript(script, { timeout: 8000 })).trim();
    const status = result.split(/\r?\n/).pop()?.trim() ?? "";
    if (status !== "ok") {
      console.error(`[Helium] ${action} did not complete:`, status || "(no output)", "| raw:", result);
    }
    return status;
  } catch (error) {
    console.error(`[Helium] ${action} failed:`, error);
    return "";
  }
}

/**
 * Open a URL in Helium. Chromium appends it as a tab to the most recently
 * focused window, and starts Helium first when it isn't running.
 */
export async function openUrlInHelium(url: string): Promise<void> {
  return launchHelium([url]);
}

/**
 * Switch to an already open tab, identified by its title.
 *
 * Chromium exposes its tab strip through UI Automation, where each tab is a
 * `TabItem` supporting `SelectionItemPattern` — selecting one activates it
 * exactly like clicking it. This is what makes Search Tabs able to *switch*
 * rather than reopen a duplicate of the URL.
 *
 * Titles are the only identifier the accessibility tree exposes; there is no
 * URL. Duplicate titles are therefore ambiguous, but tabs sharing a title are
 * almost always the same page, so activating the first is the right guess.
 * Returns false when nothing matches — for example when the page's title
 * changed since the tab list was read — and the caller falls back to opening
 * the URL.
 */
export async function switchToTabByTitle(title: string): Promise<boolean> {
  if (!title.trim()) return false;

  const executable = requireHeliumExecutable();
  const script = `
    Add-Type -AssemblyName UIAutomationClient
    Add-Type -AssemblyName UIAutomationTypes
    ${WINDOW_HELPER_SOURCE}
    ${heliumProcessLookup(executable)}

    $target = '${escapeForPowerShellSingleQuotes(title)}'
    $condition = New-Object System.Windows.Automation.PropertyCondition(
      [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
      [System.Windows.Automation.ControlType]::TabItem)

    # Collect every tab first so matching can relax progressively. The tab
    # strip's accessible name is usually the document title, but it can carry
    # state prefixes ("Audio playing - ...") or differ in whitespace from what
    # the Browser Extension reported, so an exact-only match is too brittle.
    $candidates = @()
    foreach ($window in [HeliumWindows]::All([uint32[]]$processIds)) {
      $root = [System.Windows.Automation.AutomationElement]::FromHandle($window)
      foreach ($tab in $root.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condition)) {
        $candidates += [pscustomobject]@{ Window = $window; Tab = $tab; Name = $tab.Current.Name }
      }
    }

    if ($candidates.Count -eq 0) { 'no-window'; exit }

    $normalized = $target.Trim()
    $match = $candidates | Where-Object { $_.Name -eq $target } | Select-Object -First 1
    if (-not $match) {
      $match = $candidates | Where-Object { $_.Name.Trim() -eq $normalized } | Select-Object -First 1
    }
    if (-not $match -and $normalized.Length -ge 8) {
      # Escape before using -like: page titles routinely contain [ ] * ?, which
      # would otherwise be read as wildcard syntax and match the wrong tab (or
      # nothing at all, e.g. an unclosed '[').
      $escaped = [System.Management.Automation.WildcardPattern]::Escape($normalized)
      $match = $candidates | Where-Object { $_.Name -like "*$escaped*" } | Select-Object -First 1
    }

    if (-not $match) {
      "wanted: '$target'"
      foreach ($candidate in $candidates) { "found:  '$($candidate.Name)'" }
      'no-match'
      exit
    }

    # .NET exceptions are statement-terminating but not script-terminating, so
    # without this the script would fall through to 'ok' after a failed Select()
    # and the caller would skip its fallback.
    try {
      [HeliumWindows]::Focus($match.Window)
      $pattern = $match.Tab.GetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern)
      $pattern.Select()
      'ok'
    } catch {
      "select-failed: $($_.Exception.Message)"
      'select-failed'
    }
  `;

  return (await runHeliumScript("Tab switch", script)) === "ok";
}

/**
 * Open a new tab on Helium's new tab page, in the window the user last used.
 *
 * Chromium's command line cannot express this. Measured against a running
 * Helium: ordinary web URLs and `about:blank` are appended as a tab to the
 * last-used window, but `chrome://` addresses, an unrecognised `--new-tab`, and
 * a bare launch all open a *new window* instead. So the command line offers
 * either the right placement (a tab, showing a blank page) or the right content
 * (the new tab page, in a new window) — never both.
 *
 * Focusing Helium and sending Ctrl+T gets both. Every step is checked, and
 * anything unexpected — Helium not running, no browser window, focus refused —
 * falls back to the command line rather than firing a keystroke at whatever
 * happens to be focused.
 */
export async function createNewTab(): Promise<void> {
  if (await tryNewTabViaKeystroke()) return;
  return launchHelium([NEW_TAB_PAGE]);
}

async function tryNewTabViaKeystroke(): Promise<boolean> {
  const executable = requireHeliumExecutable();
  const script = `
    Add-Type -AssemblyName System.Windows.Forms
    ${WINDOW_HELPER_SOURCE}
    ${heliumProcessLookup(executable)}

    $windows = [HeliumWindows]::All([uint32[]]$processIds)
    if ($windows.Count -eq 0) { 'no-window'; exit }

    $window = $windows[0]
    [HeliumWindows]::Focus($window)
    Start-Sleep -Milliseconds 150
    if ([HeliumWindows]::GetForegroundWindow() -ne $window) { 'not-focused'; exit }

    [System.Windows.Forms.SendKeys]::SendWait('^t')
    'ok'
  `;

  return (await runHeliumScript("New tab keystroke", script)) === "ok";
}

/** Open a new window on the new tab page. */
export async function createNewWindow(): Promise<void> {
  return launchHelium(["--new-window", NEW_TAB_PAGE]);
}

/** Open an incognito window. */
export async function createNewIncognitoWindow(): Promise<void> {
  return launchHelium(["--incognito"]);
}
