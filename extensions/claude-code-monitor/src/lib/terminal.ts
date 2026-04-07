import { Clipboard, getPreferenceValues } from "@raycast/api";
import { execFile } from "node:child_process";
import { join } from "node:path";
import { promisify } from "node:util";
import { Session } from "../types";
import { buildClaudeEnv } from "./fs-utils";
import { resolveTermProgram, JETBRAINS_FALLBACK_BUNDLES } from "./constants";

const execFileAsync = promisify(execFile);

// Editors: CLI command that focuses the project window
const EDITOR_COMMANDS: Record<string, string> = {
  vscode: "code",
  zed: "zed",
  cursor: "cursor",
  windsurf: "windsurf",
};

// Terminals: TERM_PROGRAM → macOS app name
const TERMINAL_APPS: Record<string, string> = {
  Apple_Terminal: "Terminal",
  "iTerm.app": "iTerm",
  WarpTerminal: "Warp",
  ghostty: "Ghostty",
  kitty: "kitty",
};

/**
 * Find JetBrains app path via mdfind and launch with project directory.
 * Uses the launcher binary inside .app/Contents/MacOS/ which supports
 * opening a specific project directory (multi-window aware).
 */
async function focusJetBrainsProject(
  termProgram: string,
  bundleId: string | undefined,
  cwd: string,
  env: NodeJS.ProcessEnv,
): Promise<boolean> {
  const actualBundleId = bundleId || JETBRAINS_FALLBACK_BUNDLES[termProgram];
  if (!actualBundleId) return false;

  // Validate bundle ID format to prevent mdfind query injection
  if (!/^[a-zA-Z0-9._-]+$/.test(actualBundleId)) return false;

  try {
    const { stdout } = await execFileAsync("mdfind", [
      `kMDItemCFBundleIdentifier == '${actualBundleId}'`,
    ]);
    const appPath = stdout.trim().split("\n")[0];
    if (!appPath || !appPath.endsWith(".app")) return false;

    // Derive launcher name from resolved ID: "jetbrains-idea" → "idea"
    const launcherName = termProgram.replace("jetbrains-", "");
    const launcherPath = join(appPath, "Contents", "MacOS", launcherName);

    await execFileAsync(launcherPath, [cwd], { env });
    return true;
  } catch {
    return false;
  }
}

// Terminals that support opening with a specific directory
const TERMINAL_OPEN_COMMANDS: Record<
  string,
  (cwd: string) => { cmd: string; args: string[] }
> = {
  Apple_Terminal: (cwd) => ({
    cmd: "open",
    args: ["-a", "Terminal", cwd],
  }),
  "iTerm.app": (cwd) => ({
    cmd: "open",
    args: ["-a", "iTerm", cwd],
  }),
  WarpTerminal: (cwd) => ({
    cmd: "open",
    args: [`warp://action/new_tab?path=${encodeURIComponent(cwd)}`],
  }),
  ghostty: (cwd) => ({
    cmd: "open",
    args: ["-a", "Ghostty", cwd],
  }),
  kitty: (cwd) => ({
    cmd: "open",
    args: ["-a", "kitty", cwd],
  }),
};

/**
 * Resume a Claude Code session: open terminal at project dir + copy resume command to clipboard.
 */
export async function resumeSession(
  sessionId: string,
  cwd: string,
  termProgram?: string,
): Promise<void> {
  if (!/^[a-f0-9-]+$/i.test(sessionId)) {
    throw new Error("Invalid session ID format");
  }

  const resumeCmd = `claude --resume "${sessionId}"`;
  const env = buildClaudeEnv();

  // Copy resume command to clipboard
  await Clipboard.copy(resumeCmd);

  const terminal = termProgram || "Apple_Terminal";
  const opener = TERMINAL_OPEN_COMMANDS[terminal];
  if (opener) {
    const { cmd, args } = opener(cwd);
    await execFileAsync(cmd, args, { env });
  } else {
    // Unknown terminal: fallback to open -a
    await execFileAsync("open", ["-a", terminal], { env }).catch(() => {
      // Last resort: Terminal.app
      const { cmd, args } = TERMINAL_OPEN_COMMANDS["Apple_Terminal"](cwd);
      return execFileAsync(cmd, args, { env });
    });
  }
}

/**
 * Focus the terminal/editor where the Claude Code session is running.
 * Uses term_program saved by hook.sh during SessionStart.
 * Falls back to user preference or Terminal.app.
 */
export async function focusSession(session: Session): Promise<void> {
  const prefs = getPreferenceValues<Preferences>();
  const resolved = resolveTermProgram(
    session.term_program,
    session.terminal_emulator,
    session.bundle_id,
  );
  const termProgram = resolved || prefs.defaultApp || "Apple_Terminal";
  const cwd = session.cwd;

  if (!cwd) return;

  const env = buildClaudeEnv();

  // 1. JetBrains: use app bundle launcher for project-aware focus
  if (termProgram.startsWith("jetbrains")) {
    const opened = await focusJetBrainsProject(
      termProgram,
      session.bundle_id,
      cwd,
      env,
    );
    if (!opened) {
      // Last resort: just activate the app
      const bundleId =
        session.bundle_id || JETBRAINS_FALLBACK_BUNDLES[termProgram];
      if (bundleId) {
        await execFileAsync("open", ["-b", bundleId], { env }).catch(() => {});
      }
    }
    return;
  }

  // 2. Other editors: CLI command focuses the project window
  const editorCmd = EDITOR_COMMANDS[termProgram];
  if (editorCmd) {
    try {
      await execFileAsync(editorCmd, [cwd], { env });
    } catch {
      await execFileAsync("open", ["-a", termProgram], { env }).catch(() => {});
    }
    return;
  }

  // 3. Terminal: activate the app
  const appName = TERMINAL_APPS[termProgram] || termProgram;
  try {
    await execFileAsync("open", ["-a", appName], { env });
  } catch {
    await execFileAsync("open", ["-a", termProgram], { env }).catch(() => {});
  }
}
