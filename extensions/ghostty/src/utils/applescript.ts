import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { runAppleScript as executeAppleScript } from "@raycast/utils";

const execFileAsync = promisify(execFile);

export async function runAppleScript(script: string): Promise<string> {
  const result = await executeAppleScript(script);
  return result.trim();
}

export async function runJavaScriptForAutomation(script: string): Promise<string> {
  const { stdout } = await execFileAsync("osascript", ["-l", "JavaScript", "-e", script]);
  return stdout.trim();
}
