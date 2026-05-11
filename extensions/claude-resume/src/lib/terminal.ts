import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/** Escape a string for safe inclusion in an AppleScript double-quoted literal. */
function escapeAppleScript(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/** Escape a string for safe inclusion in a shell command (single-quoted). */
function escapeShell(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

/** Build the actual shell command that runs inside the terminal session. */
function buildResumeCommand(cwd: string, uuid: string): string {
  return `cd ${escapeShell(cwd)} && claude --resume ${escapeShell(uuid)}`;
}

/** Resume a Claude session in a new iTerm2 window. */
export async function resumeInITerm(cwd: string, uuid: string): Promise<void> {
  const shellCmd = buildResumeCommand(cwd, uuid);
  const script = `
    tell application "iTerm"
      activate
      create window with default profile
      tell current session of current window
        write text "${escapeAppleScript(shellCmd)}"
      end tell
    end tell
  `;
  await execAsync(`osascript -e ${escapeShell(script)}`);
}

/** Resume a Claude session in a new Terminal.app window. */
export async function resumeInTerminalApp(cwd: string, uuid: string): Promise<void> {
  const shellCmd = buildResumeCommand(cwd, uuid);
  const script = `
    tell application "Terminal"
      activate
      do script "${escapeAppleScript(shellCmd)}"
    end tell
  `;
  await execAsync(`osascript -e ${escapeShell(script)}`);
}

/** Public helper used by the UI to dispatch based on user preference. */
export async function resumeSession(terminalApp: string, cwd: string, uuid: string): Promise<void> {
  if (terminalApp === "terminal") {
    await resumeInTerminalApp(cwd, uuid);
  } else {
    await resumeInITerm(cwd, uuid);
  }
}

export function formatResumeCommand(cwd: string, uuid: string): string {
  return buildResumeCommand(cwd, uuid);
}
