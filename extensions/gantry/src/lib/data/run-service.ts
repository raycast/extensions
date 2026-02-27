import { exec } from "../utils/exec";

/**
 * Runs a launchd job immediately using launchctl kickstart.
 */
export async function runService(label: string): Promise<void> {
  const uid = process.getuid?.();
  if (uid === undefined) {
    throw new Error("Cannot determine user ID");
  }

  const target = `gui/${uid}/${label}`;

  try {
    await exec("launchctl", ["kickstart", target]);
  } catch (error) {
    throw new Error(
      `Failed to run service: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
