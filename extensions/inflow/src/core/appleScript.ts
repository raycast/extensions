// AppleScript executor: wraps osascript calls used for paste detection and triggering.
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const OSASCRIPT = "/usr/bin/osascript";

export async function runAppleScript(script: string): Promise<string> {
  const { stdout } = await execFileAsync(OSASCRIPT, ["-e", script], {
    timeout: 3000,
    maxBuffer: 1024 * 1024,
  });
  return stdout.trim();
}
