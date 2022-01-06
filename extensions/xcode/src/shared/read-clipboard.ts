import { execAsync } from "./exec-async";

/**
 * Read current Clipboard contents
 */
export function readClipboard(): Promise<string> {
  return execAsync("pbpaste").then((output) => output.stdout.trim());
}
