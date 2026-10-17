import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function runAppleScript(script: string, timeoutMs = 5000): Promise<string> {
  try {
    const { stdout } = await execFileAsync("/usr/bin/osascript", ["-e", script], {
      timeout: timeoutMs,
      encoding: "utf8",
    });
    return stdout.trim();
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
