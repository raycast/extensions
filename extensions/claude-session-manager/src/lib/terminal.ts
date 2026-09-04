import { execFile } from "child_process";
import { promisify } from "util";
import { Application, Clipboard, getPreferenceValues } from "@raycast/api";

const execFileAsync = promisify(execFile);

interface Preferences {
  terminalApp: Application;
}

export interface ResumeResult {
  mode: "auto" | "clipboard";
  appName: string;
}

function escapeForAppleScript(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

async function runAppleScript(script: string): Promise<void> {
  await execFileAsync("osascript", ["-e", script]);
}

async function assertClaudeIsInstalled(): Promise<void> {
  try {
    await execFileAsync(process.env.SHELL ?? "/bin/zsh", ["-lic", "command -v claude"]);
  } catch {
    throw new Error("`claude` was not found on your PATH. Make sure the Claude Code CLI is installed.");
  }
}

export async function resumeSessionInTerminal(cwd: string, sessionId: string): Promise<ResumeResult> {
  await assertClaudeIsInstalled();

  const { terminalApp } = getPreferenceValues<Preferences>();
  const command = `cd ${shellQuote(cwd)} && claude --resume ${sessionId}`;

  // Terminal.app and iTerm can be scripted directly, so the command runs immediately.
  // Any other terminal just opens at the session's folder with the command on the clipboard to paste.
  switch (terminalApp.bundleId) {
    case "com.apple.Terminal":
      await runAppleScript(`
        tell application "Terminal"
          activate
          do script "${escapeForAppleScript(command)}"
        end tell
      `);
      return { mode: "auto", appName: terminalApp.name };

    case "com.googlecode.iterm2":
      await runAppleScript(`
        tell application "iTerm"
          activate
          set newWindow to (create window with default profile)
          tell current session of newWindow
            write text "${escapeForAppleScript(command)}"
          end tell
        end tell
      `);
      return { mode: "auto", appName: terminalApp.name };

    case "com.mitchellh.ghostty":
      // Ghostty 1.3+ has its own AppleScript dictionary (new window / input text / send key),
      // scoped to the window it creates — unlike System Events keystrokes, this can't land in
      // an unrelated, already-focused app.
      //
      // Note: `set initial working directory of cfg to ...` after `new surface configuration`
      // silently no-ops (Ghostty ignores the mutation) — the working directory has to be set via
      // a record literal instead, so it's baked into `cfg` from the start.
      await runAppleScript(`
        tell application "Ghostty"
          set cfg to {initial working directory:"${escapeForAppleScript(cwd)}"}
          set win to new window with configuration cfg
          set term to focused terminal of selected tab of win
          input text "${escapeForAppleScript(`claude --resume ${sessionId}`)}" to term
          send key "enter" to term
        end tell
      `);
      return { mode: "auto", appName: terminalApp.name };

    default:
      // Unknown terminal: no shared scripting dictionary to rely on. A generic "type into whatever
      // window is focused" approach (System Events keystroke injection) was tried and rejected —
      // it isn't reliably targeted at the new window and can send the command into an unrelated,
      // already-focused app instead. Safer to just open the app and let you paste yourself.
      await Clipboard.copy(command);
      await execFileAsync("open", ["-a", terminalApp.path]);
      return { mode: "clipboard", appName: terminalApp.name };
  }
}
