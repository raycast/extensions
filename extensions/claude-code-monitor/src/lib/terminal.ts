import { getPreferenceValues } from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Session } from "../types";
import { buildClaudeEnv } from "./fs-utils";

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

interface Preferences {
  defaultApp?: string;
}

function shellQuote(s: string): string {
  return "'" + s.replace(/'/g, "'\\''") + "'";
}

function escapeAppleScript(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * Resume a Claude Code session by opening a terminal and running claude --resume.
 */
export async function resumeSession(
  sessionId: string,
  cwd: string,
  termProgram?: string,
): Promise<void> {
  // Validate sessionId to prevent injection
  if (!/^[a-f0-9-]+$/i.test(sessionId)) {
    throw new Error("Invalid session ID format");
  }

  const cmd = `claude --resume "${sessionId}"`;
  const cdAndCmd = `cd ${shellQuote(cwd)} && ${cmd}`;
  const env = buildClaudeEnv();

  if (termProgram === "iTerm.app") {
    await execFileAsync(
      "osascript",
      [
        "-e",
        `tell application "iTerm" to create window with default profile command "${escapeAppleScript(cdAndCmd)}"`,
      ],
      { env },
    );
  } else if (termProgram === "WarpTerminal") {
    await execFileAsync(
      "osascript",
      [
        "-e",
        'tell application "Warp" to activate',
        "-e",
        "delay 0.3",
        "-e",
        'tell application "System Events" to keystroke "t" using command down',
      ],
      { env },
    );
    // Warp doesn't have great AppleScript support, open and let user paste
    await execFileAsync("open", ["-a", "Warp"], { env });
  } else {
    // Apple_Terminal, editors, or unknown terminals: open in Terminal.app
    await execFileAsync(
      "osascript",
      [
        "-e",
        `tell application "Terminal" to do script "${escapeAppleScript(cdAndCmd)}"`,
      ],
      { env },
    );
    await execFileAsync("open", ["-a", "Terminal"], { env });
  }
}

/**
 * Focus the terminal/editor where the Claude Code session is running.
 * Uses term_program saved by hook.sh during SessionStart.
 * Falls back to user preference or Terminal.app.
 */
export async function focusSession(session: Session): Promise<void> {
  const prefs = getPreferenceValues<Preferences>();
  const termProgram =
    session.term_program || prefs.defaultApp || "Apple_Terminal";
  const cwd = session.cwd;

  if (!cwd) return;

  const env = buildClaudeEnv();

  // 1. Editor: CLI command focuses the project window directly
  const editorCmd = EDITOR_COMMANDS[termProgram];
  if (editorCmd) {
    try {
      await execFileAsync(editorCmd, [cwd], { env });
    } catch {
      await execFileAsync("open", ["-a", termProgram], { env }).catch(() => {});
    }
    return;
  }

  // 2. Terminal: activate the app
  const appName = TERMINAL_APPS[termProgram] || termProgram;
  try {
    await execFileAsync("open", ["-a", appName], { env });
  } catch {
    await execFileAsync("open", ["-a", termProgram], { env }).catch(() => {});
  }
}
