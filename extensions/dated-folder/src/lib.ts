import type { Application } from "@raycast/api";
import { execFile, spawn } from "child_process";
import { existsSync } from "fs";
import { homedir } from "os";
import { join, resolve, sep } from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export const isWindows = process.platform === "win32";

// ---------------------------------------------------------------------------
// Folder name
// ---------------------------------------------------------------------------

const TOKENS: Record<string, (date: Date) => number> = {
  yyyy: (d) => d.getFullYear(),
  MM: (d) => d.getMonth() + 1,
  dd: (d) => d.getDate(),
  HH: (d) => d.getHours(),
  mm: (d) => d.getMinutes(),
  ss: (d) => d.getSeconds(),
};

export function formatDate(format: string, date: Date): string {
  return format.replace(/yyyy|MM|dd|HH|mm|ss/g, (token) => String(TOKENS[token](date)).padStart(2, "0"));
}

/**
 * Resolves `name` inside `parent`. `/` in the name is allowed so `yyyy/MM/dd` builds a
 * hierarchy, but the result must stay below the parent — returns null for `..`, absolute
 * paths, or anything else that would escape it.
 */
export function resolveInside(parent: string, name: string): string | null {
  const base = resolve(parent);
  const target = resolve(base, name);
  return target.startsWith(base + sep) ? target : null;
}

// ---------------------------------------------------------------------------
// Default parent folder
// ---------------------------------------------------------------------------

function system32(...segments: string[]): string {
  return join(process.env.SystemRoot ?? "C:\\Windows", "System32", ...segments);
}

/**
 * On Windows the Desktop is often not `%USERPROFILE%\Desktop`: OneDrive moves it, group
 * policy can redirect it, and the on-disk name may be localized. The registry's known-folder
 * entry is the source of truth, so ask it instead of guessing.
 */
async function desktopDir(): Promise<string> {
  if (!isWindows) return join(homedir(), "Desktop");
  try {
    const { stdout } = await execFileAsync(
      system32("reg.exe"),
      ["query", "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\User Shell Folders", "/v", "Desktop"],
      { windowsHide: true },
    );
    const value = /REG(?:_EXPAND)?_SZ\s+(.+)/.exec(stdout)?.[1].trim();
    // process.env is case-insensitive on Windows, so %UserProfile% and %USERPROFILE% both resolve
    if (value) return value.replace(/%([^%]+)%/g, (match, name) => process.env[name] ?? match);
  } catch {
    // reg.exe unavailable or key missing — fall through to the conventional location
  }
  return join(homedir(), "Desktop");
}

export async function defaultParentDir(): Promise<string> {
  return join(await desktopDir(), "temp");
}

// ---------------------------------------------------------------------------
// macOS: system default terminal
// ---------------------------------------------------------------------------

export const FALLBACK_TERMINAL_BUNDLE = "com.apple.Terminal";

const LS_PREFS = join(homedir(), "Library/Preferences/com.apple.LaunchServices/com.apple.launchservices.secure.plist");

/**
 * macOS has no "default terminal" setting in System Settings, but LaunchServices stores the
 * shell-role handler for `public.unix-executable`. That is exactly what terminal apps write when
 * they ask "make this your default terminal?" on first launch, so it is the value to follow.
 */
export async function defaultTerminalBundleId(): Promise<string> {
  if (!existsSync(LS_PREFS)) return FALLBACK_TERMINAL_BUNDLE;
  try {
    const { stdout } = await execFileAsync("/usr/bin/plutil", ["-convert", "json", "-o", "-", LS_PREFS]);
    const handlers: unknown = JSON.parse(stdout).LSHandlers;
    const entry = Array.isArray(handlers)
      ? handlers.find((h) => h?.LSHandlerContentType === "public.unix-executable" && h?.LSHandlerRoleShell)
      : undefined;
    return entry?.LSHandlerRoleShell ?? FALLBACK_TERMINAL_BUNDLE;
  } catch {
    return FALLBACK_TERMINAL_BUNDLE;
  }
}

// ---------------------------------------------------------------------------
// Windows: open a terminal at a folder
// ---------------------------------------------------------------------------

/**
 * `start` gives the program its own window and `/d` sets its working directory, which every
 * console shell and most terminal emulators use as the starting folder. Console programs
 * launched this way are hosted by the user's "Default terminal application" setting.
 * `start` returns as soon as the program is launched, so waiting for cmd's exit code is cheap
 * and is the only way to learn that the executable could not be found.
 */
function launch(exe: string, args: string[], cwd: string): Promise<void> {
  const command = ["start", '""', "/d", `"${cwd}"`, `"${exe}"`, ...args.map((arg) => `"${arg}"`)].join(" ");
  const child = spawn(process.env.ComSpec ?? system32("cmd.exe"), ["/d", "/s", "/c", `"${command}"`], {
    stdio: "ignore",
    windowsHide: true,
    windowsVerbatimArguments: true,
  });
  return new Promise((done, fail) => {
    child.once("error", fail);
    child.once("exit", (code) =>
      code === 0 ? done() : fail(new Error(`Could not launch ${exe} (exit code ${code})`)),
    );
  });
}

// The Store build of Windows Terminal lives under the protected Program Files\WindowsApps
// folder and cannot be launched from there; its app-execution alias is the supported entry point.
const WT_ALIAS = join(
  process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local"),
  "Microsoft",
  "WindowsApps",
  "wt.exe",
);

function isWindowsTerminal(app: Application): boolean {
  return (
    /^windows terminal/i.test(app.name) || /WindowsTerminal/i.test(app.windowsAppId ?? "") || /wt\.exe$/i.test(app.path)
  );
}

/** Opens `target` in a terminal on Windows and returns the app name for the HUD. */
export async function openTerminalWindows(target: string, app?: Application): Promise<string> {
  if (app && !isWindowsTerminal(app)) {
    await launch(app.path, [], target);
    return app.name;
  }
  // Windows Terminal — chosen explicitly, or as the best stand-in for "system default" when installed.
  // It ignores the inherited working directory (profiles define their own), so pass -d explicitly.
  const wt = existsSync(WT_ALIAS) ? WT_ALIAS : app?.path;
  if (wt) {
    await launch(wt, ["-d", target], target);
    return app?.name ?? "Windows Terminal";
  }
  await launch(system32("WindowsPowerShell", "v1.0", "powershell.exe"), [], target);
  return "Windows PowerShell";
}
