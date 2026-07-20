// Debug utilities for Raycast extension development
// These functions help troubleshoot sync issues

import fs from "fs/promises";
import path from "path";
import os from "os";

/**
 * Writes debug data to a JSON file in the temp directory
 * Useful for inspecting complex data structures
 */
export async function writeDebugData(
  filename: string,
  data: unknown,
): Promise<string> {
  const debugDir = path.join(os.tmpdir(), "withings-raycast-debug");
  await fs.mkdir(debugDir, { recursive: true });

  const filepath = path.join(debugDir, `${filename}.json`);
  await fs.writeFile(filepath, JSON.stringify(data, null, 2));

  console.log(`[DEBUG] Data written to: ${filepath}`);
  return filepath;
}

/**
 * Logs detailed comparison of Withings vs Garmin data
 */
export function logDataComparison(
  withingsMeasurements: Array<{ date: Date; weight?: number }>,
  garminData: Record<string, { weight: number; count?: number }>,
): void {
  console.log("\n=== DATA COMPARISON ===");
  console.log(`Withings measurements: ${withingsMeasurements.length}`);
  console.log(`Garmin days with data: ${Object.keys(garminData).length}\n`);

  withingsMeasurements.forEach((m) => {
    const dateKey = m.date.toISOString().split("T")[0];
    const garminEntry = garminData[dateKey];

    if (garminEntry) {
      const weightDiff = m.weight
        ? Math.abs(m.weight - garminEntry.weight)
        : null;
      console.log(`${dateKey}:`);
      console.log(`  Withings: ${m.weight?.toFixed(2)}kg`);
      console.log(
        `  Garmin: ${garminEntry.weight.toFixed(2)}kg (${garminEntry.count || 1} entries)`,
      );
      console.log(`  Diff: ${weightDiff?.toFixed(3)}kg`);
      console.log(
        `  Match: ${weightDiff !== null && weightDiff < 0.1 ? "✓" : "✗"}\n`,
      );
    } else {
      console.log(`${dateKey}:`);
      console.log(`  Withings: ${m.weight?.toFixed(2)}kg`);
      console.log(`  Garmin: NOT FOUND\n`);
    }
  });
  console.log("=== END COMPARISON ===\n");
}

/**
 * Quick function to dump any data with a label
 */
export function dump(label: string, data: unknown): void {
  console.log(`\n[DUMP: ${label}]`, JSON.stringify(data, null, 2), "\n");
}
