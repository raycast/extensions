import { openMemoryMachineUrl } from "../lib/installed-app";
import { buildMemoryMachineHistoryUrl, normalizeHistoryTimestampUtc } from "../lib/memory-machine";

type Input = {
  /**
   * Optional ISO 8601 datetime for History, normalized to UTC.
   *
   * Use `YYYY-MM-DDTHH:mm:ssZ` whenever possible.
   * Offsets are accepted and converted to UTC.
   *
   * Good examples:
   * - "2026-03-03T14:00:00Z"
   * - "2026-03-03T15:00:00+01:00" (becomes `2026-03-03T14:00:00Z`)
   *
   * Omit this field to open History at its default position.
   */
  timestampUtc?: string;
};

/**
 * Opens Memory Machine History, optionally at a UTC timestamp.
 *
 * @example
 * await openMemoryMachineHistory({});
 * // => { url: "memorymachine://history" }
 *
 * @example
 * await openMemoryMachineHistory({ timestampUtc: "2026-03-03T15:00:00+01:00" });
 * // => { url: "memorymachine://history?date=2026-03-03T14%3A00%3A00Z" }
 */
export default async function openMemoryMachineHistory(input: Input) {
  const timestampUtc = input.timestampUtc?.trim();
  const dateParam = timestampUtc ? normalizeHistoryTimestampUtc(timestampUtc) : undefined;
  const url = buildMemoryMachineHistoryUrl(dateParam);

  await openMemoryMachineUrl(url);

  return { url };
}
