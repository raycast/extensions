import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

/**
 * Gets the current idle time in seconds using macOS ioreg command.
 * The idle time reflects the time since the last HID event (keyboard/mouse).
 *
 * @returns The system idle time in seconds, or 0 if unable to determine
 */
export async function getIdleTimeSeconds(): Promise<number> {
  try {
    const { stdout } = await execAsync(
      "/usr/sbin/ioreg -rn IOHIDSystem | /usr/bin/grep HIDIdleTime | /usr/bin/head -n 1",
    );

    const match = stdout.match(/=\s*(\d+)/);
    if (match?.[1]) {
      const nanoseconds = Number.parseInt(match[1], 10);
      return Math.floor(nanoseconds / 1_000_000_000);
    }

    return 0;
  } catch (error) {
    console.error("Failed to get idle time:", error);
    return 0;
  }
}
