import { execSafe } from "./exec";

/** Run one AppleScript source string via osascript. Null on failure/timeout. */
export function runAppleScript(
  script: string,
  opts: { timeoutMs?: number } = {},
): Promise<string | null> {
  return execSafe("osascript", ["-e", script], {
    timeoutMs: opts.timeoutMs ?? 1500,
  });
}
