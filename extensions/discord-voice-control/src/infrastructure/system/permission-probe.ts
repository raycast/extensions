import { classifyOsascriptError, runOsascript } from "./osascript";

/**
 * Probe for macOS Accessibility permission, which the shortcut path needs to send keystrokes and
 * activate Discord. There is no public, side-effect-free API for this, so we run a benign System
 * Events query (reading the frontmost process name) and infer permission from whether it is blocked.
 *
 * Result is three-valued so callers don't over-claim:
 *  - `granted`  — the benign query succeeded.
 *  - `missing`  — the query was blocked with a permission error.
 *  - `unknown`  — some other error/timeout; we can't be sure either way.
 */
export type AccessibilityStatus = "granted" | "missing" | "unknown";

const PROBE_TIMEOUT_MS = 3000;

export async function checkAccessibility(): Promise<AccessibilityStatus> {
  const result = await runOsascript(
    ['tell application "System Events" to get name of first process whose frontmost is true'],
    { timeoutMs: PROBE_TIMEOUT_MS },
  );
  if (result.ok) {
    return "granted";
  }
  const kind = classifyOsascriptError(result);
  if (kind === "permission") {
    return "missing";
  }
  return "unknown";
}
