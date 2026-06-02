import { run } from "./shell";

function escapeAS(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * True if a GUI app with the given name is currently running.
 * Uses System Events rather than `pgrep` because app process names don't
 * always match user-facing names (e.g. "Google Chrome" runs as
 * "Google Chrome Helper" too, and we only care about the main app).
 */
export async function isAppRunning(appName: string): Promise<boolean> {
  try {
    const { stdout } = await run("/usr/bin/osascript", [
      "-e",
      `tell application "System Events" to (name of processes) contains "${escapeAS(appName)}"`,
    ]);
    return stdout.trim() === "true";
  } catch {
    return false;
  }
}

/**
 * Politely quit the named app if it's running, then wait briefly for it to
 * actually exit. Best-effort: never throws. Returns true if the app was running
 * and was asked to quit (caller may want to relaunch it after the update).
 *
 * We use `tell application "X" to quit` instead of `kill` so the app gets a
 * chance to flush state — important for things like Slack/Discord that have
 * unsaved messages, or note-taking apps with autosave debouncing.
 */
export async function quitAppIfRunning(appName: string): Promise<boolean> {
  if (!appName) return false;
  const wasRunning = await isAppRunning(appName);
  if (!wasRunning) return false;
  try {
    // execFile (run) — app name goes only into the AppleScript string literal
    // (escapeAS); no shell, so an apostrophe in the name can't break anything.
    await run("/usr/bin/osascript", [
      "-e",
      `tell application "${escapeAS(appName)}" to quit`,
    ]);
  } catch {
    // ignore — app may have already quit or refused; we'll still wait briefly
  }
  // Poll for up to ~5s waiting for the process to actually exit. Some apps
  // (Slack, Teams) take a couple of seconds to wrap up network connections.
  for (let i = 0; i < 10; i++) {
    if (!(await isAppRunning(appName))) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return true;
}
