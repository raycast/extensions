import { getPreferenceValues, getSelectedFinderItems, showHUD, Clipboard } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { stat } from "node:fs/promises";
import path from "node:path";

/**
 * Global extension preferences.
 * projectPath: default Flutter project path.
 */

/**
 * Returns the Flutter project path to use.
 * Resolution order:
 * 1. Preference `projectPath` if valid
 * 2. Selected item in Finder (folder or a file inside the project)
 *
 * Throws if no valid path is found.
 */
export async function resolveProjectPath(): Promise<string> {
  const { projectPath } = getPreferenceValues<Preferences>();

  /**
   * Global extension preferences.
   * projectPath: default Flutter project path.
   */

  if (projectPath) {
    const valid = await isExistingPath(projectPath);
    if (valid) {
      const baseDir = await ensureDirectoryPath(projectPath);
      const root = await findFlutterProjectRoot(baseDir);
      if (root) return root;
      throw new Error(
        "pubspec.yaml not found under the configured path. Select a Flutter project folder or update 'Project Path'.",
      );
    }
  }

  try {
    const items = await getSelectedFinderItems();
    const first = items?.[0];
    if (first?.path) {
      const basePath = await ensureDirectoryPath(first.path);
      const root = await findFlutterProjectRoot(basePath);
      if (root) return root;
      throw new Error("pubspec.yaml not found. Select a folder inside a Flutter project (containing pubspec.yaml).");
    }
  } catch {
    // ignore, will handle the error below
  }

  throw new Error("No project path found. Set the 'Project Path' preference or select a folder in Finder.");
}

/**
 * Checks whether a path exists.
 */
export async function isExistingPath(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns a valid directory path. If `p` is a file, returns its parent folder.
 */
async function ensureDirectoryPath(p: string): Promise<string> {
  try {
    const info = await stat(p);
    if (info.isDirectory()) return p;
  } catch {
    // fallback to parent directory
  }
  return path.dirname(p);
}

/**
 * Execute a shell command in a given directory.
 * Returns stdout/stderr. Throws on failure.
 */
// Background execution removed: everything goes through Warp

/**
 * Launches an interactive command in a graphical terminal.
 * Tries Warp first, then falls back to Terminal.app on failure.
 * Returns the terminal actually used.
 */
export type TerminalOpenResult = { terminal: "warp" } | { terminal: "terminal" };
export async function runInTerminal(command: string, cwd: string): Promise<TerminalOpenResult> {
  try {
    await runInWarp(command, cwd);
    return { terminal: "warp" };
  } catch {
    // Fallback Terminal.app
    try {
      await runInMacTerminal(command, cwd);
      return { terminal: "terminal" };
    } catch (err) {
      const message = String(err instanceof Error ? err.message : err);
      await showErrorToast("Failed to open terminal", message);
      throw err;
    }
  }
}

/**
 * Opens Warp and runs a command in a new tab.
 * Simple implementation equivalent to the command that works for the user:
 *  - activate Warp
 *  - Cmd+N
 *  - paste "cd <cwd> && <command>" then Enter
 * Lets the error bubble up so the caller can handle it.
 */
export async function runInWarp(command: string, cwd: string): Promise<void> {
  // Prepare the command for immediate execution upon paste
  const line = `cd "${cwd.replace(/"/g, '\\"')}" && ${command}`;
  // Prepare the clipboard via Raycast API (avoids AppleScript escaping)
  await Clipboard.copy(line);
  // Open Warp GUI robustly:
  // 1) open -a Warp (via do shell script)  2) activate  3) ensure window with Cmd+N
  const script = `
    try
      do shell script "open -a Warp"
    end try
    tell application "Warp" to activate
    tell application "System Events"
      repeat until (exists process "Warp")
        delay 0.1
      end repeat
      tell process "Warp"
        set frontmost to true

        -- Wait for a window
        repeat until (exists window 1)
          delay 0.1
        end repeat

        -- New tab
        keystroke "n" using {command down}
        delay 0.1

        -- Paste (⌘V)
        keystroke "v" using {command down}
      end tell
    end tell
  `;
  try {
    await runAppleScript(script);
  } catch (e) {
    const message = String(e instanceof Error ? e.message : e);
    throw new Error(`Warp opening failed: ${message}`);
  }
}

/**
 * Opens Terminal.app and runs the command in a new tab/window.
 */
async function runInMacTerminal(command: string, cwd: string): Promise<void> {
  const script = `
    tell application "Terminal"
      activate
      do script "cd " & quote & "${escapeForAppleScript(cwd)}" & quote & " && ${escapeForAppleScript(command)}"
    end tell
  `;
  await runAppleScript(script);
}

/**
 * Shows a standardized error toast.
 */
export async function showErrorToast(title: string, message?: string): Promise<void> {
  await showHUD(`${title}${message ? `: ${message}` : ""}`);
}

/**
 * Shows a standardized success HUD.
 */
export async function showSuccessHUD(message: string): Promise<void> {
  await showHUD(message);
}

/**
 * Escapes special characters for AppleScript.
 */
function escapeForAppleScript(input: string): string {
  return input.replace(/"/g, '\\"');
}

/**
 * Builds the `flutter` command to execute.
 * If `Flutter SDK Path` is set, uses "<sdk>/bin/flutter".
 * Otherwise uses the binary in PATH ("flutter").
 */
export function buildFlutterCommand(subcommandAndArgs: string): string {
  const { flutterSdkPath } = getPreferenceValues<Preferences>();
  const trimmed = subcommandAndArgs.trim();
  if (flutterSdkPath && flutterSdkPath.length > 0) {
    const bin = `${flutterSdkPath.replace(/\/$/, "")}/bin/flutter`;
    const quotedBin = `"${bin.replace(/"/g, '\\"')}"`;
    return `${quotedBin} ${trimmed}`.trim();
  }
  return `flutter ${trimmed}`.trim();
}

/**
 * Builds the flutter command using the specified SDK when present.
 * Example: buildFlutterCommand("run -d ios") → "flutter run -d ios" or "/path/sdk/bin/flutter run -d ios".
 */
// Command construction delegated to the callers (we pass the full string)

/**
 * Asynchronous variant that checks the existence of the SDK binary.
 * If the binary does not exist, we fall back to `flutter` in PATH.
 */
// Advanced SDK command building removed: we use "flutter ..." directly

/**
 * Builds execution environment variables, prefixing PATH with the Flutter SDK if provided.
 */
// No more custom environment: Warp uses the shell environment

/**
 * Returns true if verbose logs are enabled via preferences.
 */
// Removed verbose logger to simplify

/**
 * Walks up directories from `startDir` to find a `pubspec.yaml`.
 * Returns the Flutter project root folder if found, otherwise undefined.
 */
async function findFlutterProjectRoot(startDir: string): Promise<string | undefined> {
  let current: string | undefined = startDir;
  while (current && current !== path.dirname(current)) {
    const pubspecPath = path.join(current, "pubspec.yaml");
    if (await isExistingPath(pubspecPath)) return current;
    current = path.dirname(current);
  }
  return undefined;
}
