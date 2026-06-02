import { open } from "@raycast/api";
import { run } from "./shell";

function escapeAS(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * Open Terminal.app and run the given command. Used as the universal escape
 * hatch when an install fails inside Raycast (e.g. mas needing sudo) — the user
 * can finish it with one click in a real terminal.
 *
 * Each AppleScript statement is passed as its own -e argument straight to
 * osascript via execFile (run) — there is no surrounding shell, so the only
 * escaping needed is AppleScript's own string-literal escaping (escapeAS handles
 * " and \). A shell-string form would break on an apostrophe in `command`.
 */
export async function openInTerminal(command: string): Promise<void> {
  await run("/usr/bin/osascript", [
    "-e",
    'tell application "Terminal" to activate',
    "-e",
    `tell application "Terminal" to do script "${escapeAS(command)}"`,
  ]);
}

/**
 * Open the Mac App Store directly to a specific app's page.
 * Uses Raycast's `open` (which calls macOS launch services) instead of
 * shelling out — no shell metacharacters get the chance to be interpreted.
 */
export async function openInAppStore(appId: number): Promise<void> {
  await open(`macappstore://apps.apple.com/app/id${appId}`);
}

/**
 * Open an http(s) URL in the user's default browser.
 * Uses Raycast's `open` API so URL contents (e.g. a cask.homepage value that
 * might contain backticks or `$()`) can never be interpreted by a shell.
 */
export async function openHomepage(url: string): Promise<void> {
  await open(url);
}

/**
 * Run a shell command with administrator privileges via osascript. macOS shows
 * a system password dialog. Useful for mas/brew commands that internally need
 * sudo to write protected paths.
 */
export async function runShellAsAdmin(
  command: string,
  prompt: string,
): Promise<void> {
  // The AppleScript is a single -e argument handed straight to osascript via
  // execFile (run) — no shell in between, so only AppleScript string-literal
  // escaping applies (escapeAS handles " and \). Previously this was
  // interpolated into a shell-quoted `-e '...'`, which an apostrophe in
  // `prompt`/`command` (e.g. an app named "Let's VPN") would close early,
  // silently failing the admin-elevated upgrade.
  const script = `do shell script "${escapeAS(command)}" with administrator privileges with prompt "${escapeAS(prompt)}"`;
  await run("/usr/bin/osascript", ["-e", script]);
}
