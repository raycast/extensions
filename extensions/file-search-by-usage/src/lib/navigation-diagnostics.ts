import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { getHeapSpaceStatistics } from "node:v8";

/** Development-only lifecycle samples for investigating native worker memory. */
let enabled = false;
const logFile = path.join(os.tmpdir(), "raycast-file-search-navigation.log");
const maxLogBytes = 256 * 1024;

function megabytes(bytes: number): number {
  return Math.round(bytes / 1_048_576);
}

function resourceCounts(): Record<string, number> {
  return (process.getActiveResourcesInfo?.() ?? []).reduce(
    (counts: Record<string, number>, resource) => {
      counts[resource] = (counts[resource] ?? 0) + 1;
      return counts;
    },
    {},
  );
}

export function enableNavigationDiagnostics(value: boolean): void {
  enabled = value;
}

export function traceNavigation(
  event: string,
  details: Record<string, unknown>,
): void {
  if (!enabled) return;
  const memory = process.memoryUsage();
  const spaces = new Map(
    getHeapSpaceStatistics().map((space) => [
      space.space_name,
      space.space_used_size,
    ]),
  );
  const sample = JSON.stringify({
    event,
    ...details,
    heapMb: megabytes(memory.heapUsed),
    externalMb: megabytes(memory.external),
    oldSpaceMb: megabytes(spaces.get("old_space") ?? 0),
    newSpaceMb: megabytes(spaces.get("new_space") ?? 0),
    largeObjectMb: megabytes(spaces.get("large_object_space") ?? 0),
    resources: resourceCounts(),
  });
  console.log("file-search-navigation", sample);
  try {
    if (fs.existsSync(logFile) && fs.statSync(logFile).size >= maxLogBytes)
      fs.truncateSync(logFile);
    fs.appendFileSync(logFile, `file-search-navigation ${sample}\n`);
  } catch {
    // Diagnostics must never interrupt navigation.
  }
}

export function traceNavigationAfterRelease(
  event: string,
  details: Record<string, unknown>,
): void {
  if (!enabled) return;
  setTimeout(() => traceNavigation(event, details), 1000);
}
