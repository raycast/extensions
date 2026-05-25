import { runShell } from "./shell";

function escapeAS(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * Open Terminal.app and run the given command. Used as the universal escape
 * hatch when an install fails inside Raycast (e.g. mas needing sudo) — the user
 * can finish it with one click in a real terminal.
 */
export async function openInTerminal(command: string): Promise<void> {
  const escaped = escapeAS(command);
  await runShell(
    `osascript -e 'tell application "Terminal" to activate' ` +
      `-e 'tell application "Terminal" to do script "${escaped}"'`,
  );
}

/** Open the Mac App Store directly to a specific app's page. */
export async function openInAppStore(appId: number): Promise<void> {
  await runShell(`open "macappstore://apps.apple.com/app/id${appId}"`);
}

/** Open an http(s) URL in the user's default browser. */
export async function openHomepage(url: string): Promise<void> {
  await runShell(`open "${url.replace(/"/g, "%22")}"`);
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
  const escapedCmd = escapeAS(command);
  const escapedPrompt = escapeAS(prompt);
  await runShell(
    `osascript -e 'do shell script "${escapedCmd}" with administrator privileges with prompt "${escapedPrompt}"'`,
  );
}
