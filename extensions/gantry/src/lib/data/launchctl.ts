import { exec } from "../utils/exec";
import type { LaunchctlListEntry } from "../types";

/**
 * Runs `launchctl list` and parses the tab-separated output into structured entries.
 */
export async function listServices(): Promise<LaunchctlListEntry[]> {
  try {
    const result = await exec("launchctl", ["list"]);
    const lines = result.trim().split("\n");

    // Skip the header line
    const dataLines = lines.slice(1);
    const entries: LaunchctlListEntry[] = [];

    for (const line of dataLines) {
      const parts = line.split("\t");
      if (parts.length < 3) continue;

      const [pidStr, statusStr, label] = parts as [string, string, string];

      const pid = pidStr.trim() === "-" ? null : parseInt(pidStr.trim(), 10);
      const exitCode = parseInt(statusStr.trim(), 10);
      const trimmedLabel = label.trim();

      if (trimmedLabel && !isNaN(exitCode)) {
        entries.push({
          pid: pid !== null && isNaN(pid) ? null : pid,
          exitCode,
          label: trimmedLabel,
        });
      }
    }

    return entries;
  } catch (error) {
    console.error("Failed to run launchctl list:", error);
    return [];
  }
}
