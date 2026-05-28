import { runAppleScript } from "@raycast/utils";

function shellQuote(s: string): string {
  return "'" + s.replace(/'/g, "'\\''") + "'";
}

function appleScriptEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export async function launchClaude(
  worktreePath: string,
  opts: { resumeSessionId?: string; newSessionName?: string } = {},
): Promise<void> {
  let claudeCmd = "claude";
  if (opts.resumeSessionId) {
    claudeCmd += ` --resume ${shellQuote(opts.resumeSessionId)}`;
  } else if (opts.newSessionName) {
    claudeCmd += ` -n ${shellQuote(opts.newSessionName)}`;
  }

  const fullCommand = `cd ${shellQuote(worktreePath)} && clear && ${claudeCmd}`;
  const script = `
    tell application "Terminal"
      activate
      do script "${appleScriptEscape(fullCommand)}"
    end tell
  `;
  await runAppleScript(script);
}
