import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export function escapeAppleScriptString(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r/g, "\\r").replace(/\n/g, "\\n");
}

export async function executeAppleScript(script: string, timeoutMs = 5000): Promise<string> {
  const { stdout } = await execFileAsync("/usr/bin/osascript", ["-e", script], {
    timeout: timeoutMs,
    encoding: "utf8",
  });
  return stdout.trim();
}

export async function runAppleScript(script: string, timeoutMs = 5000): Promise<string> {
  try {
    return await executeAppleScript(script, timeoutMs);
  } catch {
    return "";
  }
}

export async function getRunningPhotoshopName(): Promise<string | null> {
  const script =
    'tell application "System Events" to get name of first application process whose name contains "Photoshop"';
  const name = await runAppleScript(script, 3000);
  return name.length > 0 ? name : null;
}
