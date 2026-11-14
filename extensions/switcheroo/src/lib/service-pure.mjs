// ─────────────────────────────────────────────────────────────────────
// service-pure.mjs — pure functions for Switcheroo service management.
//
// Zero runtime dependencies. Safe to unit test with node:test.
// Security: Homebrew executable paths are validated by EXACT match
// against two official paths. No prefix/suffix matching, no traversal.
// ─────────────────────────────────────────────────────────────────────

// Exact allowlisted Homebrew executable paths.
const HOMEBREW_EXACT_EXECS = [
  "/opt/homebrew/opt/switcheroo/Switcheroo.app/Contents/MacOS/switcheroo",
  "/usr/local/opt/switcheroo/Switcheroo.app/Contents/MacOS/switcheroo",
];

/** Parse the `program =` line from `launchctl print` output.
 * Pure function — safe to unit test. */
export function parseLaunchctlProgram(output) {
  for (const line of output.split("\n")) {
    const m = line.match(/^\s*program\s*=\s*(.*)$/);
    if (m) return m[1];
  }
  return "";
}

/** Validate that a path is an EXACT Homebrew Switcheroo executable.
 * No prefix/suffix matching, no path traversal. */
export function isValidHomebrewExec(path) {
  if (!path) return false;
  return HOMEBREW_EXACT_EXECS.includes(path);
}

export { HOMEBREW_EXACT_EXECS };
