import { Color } from "@raycast/api";

import { colorForStatusValue } from "../components/MetadataLabel";

/**
 * Color for the Memory tags from macOS's own pressure verdict rather than the used percentage:
 * Apple Silicon routinely runs at 75–85 % used with pressure "Normal", so the percentage alone
 * over-reports trouble. The four real levels share the status-word map with `MetadataLabel`, so
 * the tag and the "Memory Pressure" row beneath it agree. "Unknown" (sysctl failed) returns null:
 * the tag then falls back to percent color while the row itself flags the unknown level.
 */
const PRESSURE_LEVELS = new Set(["normal", "warning", "urgent", "critical"]);

export function colorForMemoryPressure(pressureLevel: string | undefined): Color | null {
  const level = pressureLevel?.trim().toLowerCase();
  return level && PRESSURE_LEVELS.has(level) ? colorForStatusValue(level) : null;
}
