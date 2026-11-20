import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

/** Matches the ioreg line:  "HIDIdleTime" = 481917541 */
const IDLE_PATTERN = /"HIDIdleTime"\s*=\s*(\d+)/;

/**
 * Seconds since the last keyboard or mouse input.
 *
 * Uses ioreg rather than AppleScript deliberately. The System Events route needs
 * Automation permission and was measured hanging for two minutes before failing
 * with "AppleEvent timed out (-1712)". This needs no permission and returns in
 * roughly 15ms.
 *
 * The narrow `-n IOHIDSystem -r -d 1 -k HIDIdleTime` form returns about 4KB
 * instead of the 325KB a bare `-c IOHIDSystem` dumps.
 *
 * Returns 0 when the value cannot be read. That biases towards recording time
 * rather than silently dropping it, which is the right direction for a tracker.
 */
export async function getIdleSeconds(): Promise<number> {
  try {
    const { stdout } = await run("/usr/sbin/ioreg", ["-n", "IOHIDSystem", "-r", "-d", "1", "-k", "HIDIdleTime"], {
      timeout: 5_000,
      maxBuffer: 1024 * 1024,
    });

    const match = IDLE_PATTERN.exec(stdout);
    const raw = match?.[1];
    if (!raw) return 0;

    const nanoseconds = Number(raw);
    if (!Number.isFinite(nanoseconds) || nanoseconds < 0) return 0;

    return nanoseconds / 1e9;
  } catch {
    return 0;
  }
}
