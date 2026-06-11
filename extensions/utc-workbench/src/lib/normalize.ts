import { DateTime } from "luxon";
import type { ParsedTimestamp } from "../types";

/**
 * Normalize an epoch-ms value into a canonical ParsedTimestamp.
 * Does not set `ambiguous`, `label`, or `url` — callers must set those.
 */
export function normalize(
  epochMs: number,
  data: string
): Omit<ParsedTimestamp, "ambiguous" | "label" | "url" | "source" | "format"> {
  const dt = DateTime.fromMillis(epochMs, { zone: "utc" });

  return {
    timestamp: epochMs,
    iso: dt.toISO() ?? new Date(epochMs).toISOString(),
    local: dt.toLocal().toFormat("yyyy-MM-dd HH:mm:ss.SSS ZZZZ"),
    data,
  };
}

/**
 * Reinterpret an ambiguous timestamp (originally assumed UTC) as being in the given timezone.
 * Returns a new ParsedTimestamp with corrected UTC values.
 */
export function reinterpret(parsed: ParsedTimestamp, zone: string): ParsedTimestamp {
  // The original epochMs assumed UTC. We need to figure out what the wall-clock time was,
  // then reinterpret that wall-clock time as being in `zone`.
  const wallClock = DateTime.fromMillis(parsed.timestamp, { zone: "utc" });
  const reinterpreted = DateTime.fromObject(
    {
      year: wallClock.year,
      month: wallClock.month,
      day: wallClock.day,
      hour: wallClock.hour,
      minute: wallClock.minute,
      second: wallClock.second,
      millisecond: wallClock.millisecond,
    },
    { zone }
  );

  if (!reinterpreted.isValid) return parsed;

  const epochMs = reinterpreted.toMillis();
  return {
    ...normalize(epochMs, parsed.data),
    ambiguous: false,
    label: parsed.label,
    url: parsed.url,
    source: parsed.source,
    format: parsed.format,
  };
}
