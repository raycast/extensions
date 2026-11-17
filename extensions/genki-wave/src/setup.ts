// Spots dictation setup problems that otherwise fail silently. Pure, so it's
// testable with node:test.

/**
 * True when the latest dictation in the listener log failed because Raycast
 * never put a transcript on the clipboard, i.e. its Output isn't "Copy to Clipboard".
 */
export function dictationOutputProblem(log: string): boolean {
  for (const line of log.trimEnd().split("\n").reverse()) {
    if (line.includes('"state":"sent"')) return false;
    if (line.includes("Raycast produced no transcript")) return true;
  }
  return false;
}

/**
 * True when the listener's latest start logged that it lacks the Accessibility
 * permission it needs to press keys and type dictation into other apps.
 */
export function accessibilityProblem(log: string): boolean {
  for (const line of log.trimEnd().split("\n").reverse()) {
    if (line.includes("Accessibility permission granted")) return false;
    if (line.includes("Accessibility permission needed")) return true;
    if (line.includes("wave-helper: bindings:")) return false;
  }
  return false;
}
