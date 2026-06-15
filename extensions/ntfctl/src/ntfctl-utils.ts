import { execSync } from "child_process";
import * as path from "path";
import * as fs from "fs";

/**
 * Resolve the applescripts directory relative to this extension.
 * When installed from source the scripts live at:
 *   <extension-dir>/../../../   (raycast → notifications → macscripts/ntfctl)
 *
 * When the extension is installed via the Raycast Store the user
 * can set the APPLESCRIPTS_DIR environment variable.
 */
function findApplescriptsDir(): string {
  const envDir = process.env.APPLESCRIPTS_DIR;
  if (envDir && fs.existsSync(envDir)) {
    return envDir;
  }

  // 1) Bundled with the extension (production — scripts/ sits next to the built .js files)
  // 2) Development — walk up from src/ or dist/ to the ntfctl repo root
  // 3) Absolute path to the submodule under the settings repo
  const home = process.env.HOME || "/Users/" + (process.env.USER || "taeahn");
  const candidates = [
    path.resolve(__dirname, "scripts"), // bundled in dist/scripts/
    path.resolve(__dirname, "..", ".."), // dist/ → ntfctl/  OR  src/ → ntfctl/
    path.resolve(__dirname, "..", "..", ".."), // dist/ → macscripts/ (fallback)
    path.resolve(home, "devs/personal/2026/settings/macscripts/ntfctl"), // absolute submodule path
  ];

  for (const dir of candidates) {
    const testFile = path.join(dir, "ntfctl-clear.applescript");
    if (fs.existsSync(testFile)) {
      return dir;
    }
  }

  // Last resort — user must have set APPLESCRIPTS_DIR
  throw new Error(
    "Could not find applescript files. Set APPLESCRIPTS_DIR environment variable to the directory containing ntfctl-clear.applescript, e.g.:\n" +
      '  export APPLESCRIPTS_DIR="/Users/you/path/to/notifications"',
  );
}

const APPLESCRIPTS = findApplescriptsDir();

/**
 * Run an AppleScript file and return stdout.
 */
export function runAppleScript(scriptName: string): string {
  const scriptPath = path.join(APPLESCRIPTS, scriptName);
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`Script not found: ${scriptPath}`);
  }
  return execSync(`osascript "${scriptPath}"`, {
    encoding: "utf-8",
    timeout: 15_000,
  }).trim();
}

/**
 * Run a specific action on the unified ntfctl.applescript.
 */
export function runControlAction(action: string): string {
  const scriptPath = path.join(APPLESCRIPTS, "ntfctl.applescript");
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`Script not found: ${scriptPath}`);
  }
  return execSync(`osascript "${scriptPath}" ${action}`, {
    encoding: "utf-8",
    timeout: 15_000,
  }).trim();
}

/**
 * Parse the output of ntfctl-latest.applescript or the "latest" control action.
 * The dialog output contains a button-returned line like:
 *   button returned:OK, gave up:false
 * But the actual notification text is the dialog body that the user sees.
 *
 * We re-run the script in a way that captures the notification content
 * without showing the dialog, by using the control script's latest action
 * with output parsing.
 */
export function getLatestNotificationText(): {
  app: string;
  title: string;
  body: string;
} | null {
  try {
    // The unified script shows a dialog; we need to extract the content.
    // Let's use a direct AppleScript call to get just the data.
    const raw = runAppleScript("ntfctl-latest.applescript");

    // Try to parse the dialog output
    const lines = raw.split("\n").filter(Boolean);
    for (const line of lines) {
      if (line.startsWith("button returned:")) continue;
      // The dialog result is the notification content
    }

    // Fallback: parse from raw output which contains the dialog text
    return parseNotificationOutput(raw);
  } catch {
    return null;
  }
}

function parseNotificationOutput(
  raw: string,
): { app: string; title: string; body: string } | null {
  const appMatch = raw.match(/App:\s*(.+)/);
  const titleMatch = raw.match(/Title:\s*(.+)/);
  const bodyMatch = raw.match(/Body:\s*(.+)/);

  if (appMatch && titleMatch && bodyMatch) {
    return {
      app: appMatch[1].trim(),
      title: titleMatch[1].trim(),
      body: bodyMatch[1].trim(),
    };
  }

  // Try the compact format from unified script
  const lines = raw.split("\n").filter((l) => l.trim());
  for (const line of lines) {
    // The compact format shows like: "📬  AppName\n     Title\n     Body"
    if (line.includes("📬")) {
      const parts = line.replace("📬", "").trim();
      const app = parts;
      const title = lines[lines.indexOf(line) + 1]?.trim() || "";
      const body = lines[lines.indexOf(line) + 2]?.trim() || "";
      if (app && title) {
        return { app, title, body };
      }
    }
  }

  return null;
}

/**
 * Run a direct AppleScript snippet and return the output.
 * Used when we need raw data without needing a separate script file.
 */
export function runAppleScriptSnippet(snippet: string): string {
  return execSync(`osascript -e '${snippet.replace(/'/g, "'\\''")}'`, {
    encoding: "utf-8",
    timeout: 10_000,
  }).trim();
}
