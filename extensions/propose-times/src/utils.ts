import type { TimeSlot } from "./types";

/**
 * Encodes alternative time slots as unix timestamps in URL params.
 * Used by booking URLs to populate the time selection dropdown.
 */
export function encodeAlternativeSlots(
  params: URLSearchParams,
  alternativeSlots?: TimeSlot[],
): void {
  if (alternativeSlots && alternativeSlots.length > 0) {
    const altTimestamps = alternativeSlots
      .map((s) => Math.floor(new Date(s.start_at).getTime() / 1000))
      .join(",");
    params.set("alt_slots", altTimestamps);
  }
}
