// src/lib/gui-status.ts
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { promises as fs } from "node:fs";

const execFileAsync = promisify(execFile);

/**
 * Whether the TaskTick GUI process is currently running.
 *
 * Derives the .app bundle from the resolved CLI path so prod and dev builds
 * are detected independently. The CLI's `run` command will silently launch
 * the GUI on demand — but raycast users want a fast "not running" signal
 * rather than an unsolicited app launch on Enter, so we gate run/stop/restart
 * on this check at the extension level.
 *
 * Returns `true` (skip check, assume running) if cliPath isn't inside an
 * .app bundle — e.g. a hand-built CLI in /usr/local/bin without a sibling
 * .app, or a future packaging form we don't recognize. Better to over-permit
 * than to block legitimate use.
 */
export async function isGuiRunning(cliPath: string): Promise<boolean> {
  let resolved = cliPath;
  try {
    resolved = await fs.realpath(cliPath);
  } catch {
    // realpath fails for broken symlinks; fall through with original path.
  }
  const appMatch = resolved.match(/^(.*\.app)\//);
  if (!appMatch) return true;
  const appPath = appMatch[1];
  // Prod GUI binary: <App>/Contents/MacOS/TaskTick
  // Dev GUI binary:  <App>/Contents/MacOS/TaskTick Dev
  const appName = appPath
    .split("/")
    .pop()!
    .replace(/\.app$/, "");
  const guiBinary = `${appPath}/Contents/MacOS/${appName}`;
  try {
    await execFileAsync("pgrep", ["-f", guiBinary]);
    return true;
  } catch {
    return false;
  }
}
