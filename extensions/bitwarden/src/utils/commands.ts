import { execa } from "execa";

/**
 * Runs an AppleScript script.
 *
 * @param appleScript The script code.
 * @param args The arguments to pass to the script.
 */
export async function runAppleScript(appleScript: string, args: string[]) {
  const { stdout } = await execa("/usr/bin/osascript", ["-e", appleScript, ...args], { shell: false });
  return stdout;
}
