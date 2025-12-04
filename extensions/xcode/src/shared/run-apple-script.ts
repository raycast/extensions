import { execAsync } from "./exec-async";

/**
 * Run AppleScript
 * @param appleScript The AppleScript either an inline string or an array of lines
 */
export function runAppleScript(appleScript: string | string[]): Promise<string> {
  // Declare parameters
  let parameters: string;
  // Check if AppleScript is an array
  if (Array.isArray(appleScript)) {
    // Map each line with a separate "-e" flag
    parameters = appleScript.map((line) => `-e '${line}'`).join(" ");
  } else {
    // Use inline AppleScript
    parameters = `-e '${appleScript}'`;
  }
  // Execute osascript with parameters
  return execAsync(`osascript ${parameters}`).then((output) => output.stdout);
}
