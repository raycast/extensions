import { open } from "@raycast/api";
import { buildOrbitTimelineUrl, normalizeTimelineTimestampUtc } from "../lib/orbit";

type Input = {
  /**
   * Optional ISO 8601 datetime for Timeline, normalized to UTC.
   *
   * Use `YYYY-MM-DDTHH:mm:ssZ` whenever possible.
   * Offsets are accepted and converted to UTC.
   *
   * Good examples:
   * - "2026-03-03T14:00:00Z"
   * - "2026-03-03T15:00:00+01:00" (becomes `2026-03-03T14:00:00Z`)
   *
   * Omit this field to open Timeline at its default position.
   */
  timestampUtc?: string;
};

/**
 * Opens Orbit Timeline, optionally at a UTC timestamp.
 *
 * @example
 * await openOrbitTimeline({});
 * // => { url: "orbit://timeline" }
 *
 * @example
 * await openOrbitTimeline({ timestampUtc: "2026-03-03T15:00:00+01:00" });
 * // => { url: "orbit://timeline?date=2026-03-03T14%3A00%3A00Z" }
 */
export default async function openOrbitTimeline(input: Input) {
  const timestampUtc = input.timestampUtc?.trim();
  const dateParam = timestampUtc ? normalizeTimelineTimestampUtc(timestampUtc) : undefined;
  const url = buildOrbitTimelineUrl(dateParam);

  await open(url);

  return { url };
}
