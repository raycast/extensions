import { execFile } from "node:child_process";
import { promisify } from "node:util";

const pExecFile = promisify(execFile);

async function frontmostAppName(): Promise<string | null> {
  try {
    const { stdout } = await pExecFile("osascript", [
      "-e",
      'tell application "System Events" to get name of first application process whose frontmost is true',
    ]);
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

async function runOsascript(script: string): Promise<string | null> {
  try {
    const { stdout } = await pExecFile("osascript", ["-e", script]);
    const url = stdout.trim();
    return url || null;
  } catch {
    return null;
  }
}

const BROWSER_SCRIPTS: Record<string, string> = {
  Safari: 'tell application "Safari" to get URL of current tab of front window',
  "Google Chrome": 'tell application "Google Chrome" to get URL of active tab of front window',
  "Microsoft Edge": 'tell application "Microsoft Edge" to get URL of active tab of front window',
  Brave: 'tell application "Brave Browser" to get URL of active tab of front window',
  "Brave Browser": 'tell application "Brave Browser" to get URL of active tab of front window',
  Arc: 'tell application "Arc" to get URL of active tab of front window',
  Vivaldi: 'tell application "Vivaldi" to get URL of active tab of front window',
  Firefox: 'tell application "System Events" to keystroke "l" using {command down}',
};

/**
 * Get the URL of the frontmost browser tab via AppleScript. Used as a fallback when
 * Raycast's BrowserExtension API isn't available (notably Safari).
 */
export async function getFrontmostTabUrl(): Promise<{ url: string; browser: string } | null> {
  const frontApp = await frontmostAppName();
  if (frontApp && BROWSER_SCRIPTS[frontApp] && frontApp !== "Firefox") {
    const url = await runOsascript(BROWSER_SCRIPTS[frontApp]);
    if (url && /^https?:\/\//i.test(url)) {
      return { url, browser: frontApp };
    }
  }

  for (const [browser, script] of Object.entries(BROWSER_SCRIPTS)) {
    if (browser === "Firefox") continue;
    if (browser === frontApp) continue;
    const url = await runOsascript(script);
    if (url && /^https?:\/\//i.test(url)) {
      return { url, browser };
    }
  }

  return null;
}
