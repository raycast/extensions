import { utcToZonedTime } from "date-fns-tz";
import type { TimeSlot } from "./types";

type TimeBucket = "morning" | "afternoon" | "evening";

interface Gap {
  start: Date; // When the gap starts (last available slot before gap)
  end: Date; // When the gap ends (first available slot after gap)
}

interface ScoredSlot {
  slot: TimeSlot;
  score: number;
  bucket: TimeBucket;
}

/**
 * Get the time bucket for a slot based on hour of day in the target timezone.
 * - Morning: before 12pm
 * - Afternoon: 12pm - 5pm
 * - Evening: 5pm onwards
 */
function getTimeBucket(slot: TimeSlot, timezone: string): TimeBucket {
  const zonedDate = utcToZonedTime(new Date(slot.start_at), timezone);
  const hour = zonedDate.getHours();

  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

/**
 * Detect gaps in available slots that likely indicate meetings.
 * A gap is when consecutive slots are more than the expected increment apart.
 */
function detectGaps(slots: TimeSlot[], incrementMinutes: number = 30): Gap[] {
  if (slots.length < 2) return [];

  // Sort slots chronologically
  const sorted = [...slots].sort(
    (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
  );

  const gaps: Gap[] = [];
  const gapThreshold = incrementMinutes * 60 * 1000 * 1.5; // 1.5x increment = gap

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = new Date(sorted[i].start_at);
    const next = new Date(sorted[i + 1].start_at);
    const diff = next.getTime() - current.getTime();

    if (diff > gapThreshold) {
      gaps.push({
        start: current,
        end: next,
      });
    }
  }

  return gaps;
}

/**
 * Score a slot by its proximity to the nearest gap.
 * Slots closer to gaps (adjacent to meetings) get higher scores.
 * Returns a score between 0 and 1.
 */
function scoreSlotByProximity(slot: TimeSlot, gaps: Gap[]): number {
  if (gaps.length === 0) {
    // No gaps = no meetings detected, all slots equal
    return 0.5;
  }

  const slotTime = new Date(slot.start_at).getTime();
  let minDistance = Infinity;

  for (const gap of gaps) {
    // Distance to gap start (slot before meeting)
    const distToStart = Math.abs(slotTime - gap.start.getTime());
    // Distance to gap end (slot after meeting)
    const distToEnd = Math.abs(slotTime - gap.end.getTime());

    minDistance = Math.min(minDistance, distToStart, distToEnd);
  }

  // Convert distance to score: closer = higher score
  // Score = 1 / (1 + minutes / 30)
  // At gap edge: 1.0, 30 min away: 0.5, 60 min: 0.33
  const minutesAway = minDistance / (60 * 1000);
  return 1 / (1 + minutesAway / 30);
}

/**
 * Select smart slots prioritizing:
 * 1. Batching: slots adjacent to meetings (high gap-proximity score)
 * 2. Diversity: at least one slot from a different time bucket
 *
 * Returns slots sorted chronologically for display.
 */
export function selectSmartSlots(
  slots: TimeSlot[],
  timezone: string,
  maxSlots: number = 4,
): TimeSlot[] {
  // Deduplicate slots by start_at (API may return duplicates)
  const seen = new Set<string>();
  const uniqueSlots = slots.filter((slot) => {
    if (seen.has(slot.start_at)) return false;
    seen.add(slot.start_at);
    return true;
  });

  if (uniqueSlots.length <= maxSlots) {
    // Not enough slots to be selective, return all sorted
    return [...uniqueSlots].sort(
      (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
    );
  }

  // Detect gaps (meetings)
  const gaps = detectGaps(uniqueSlots);

  // Score all slots
  const scoredSlots: ScoredSlot[] = uniqueSlots.map((slot) => ({
    slot,
    score: scoreSlotByProximity(slot, gaps),
    bucket: getTimeBucket(slot, timezone),
  }));

  // Sort by score descending
  scoredSlots.sort((a, b) => b.score - a.score);

  // Find majority bucket (bucket with most high-scoring slots)
  const bucketCounts: Record<TimeBucket, number> = {
    morning: 0,
    afternoon: 0,
    evening: 0,
  };

  // Count slots in top half by score to determine majority
  const topHalf = scoredSlots.slice(0, Math.ceil(scoredSlots.length / 2));
  for (const s of topHalf) {
    bucketCounts[s.bucket]++;
  }

  const majorityBucket = (
    Object.entries(bucketCounts) as [TimeBucket, number][]
  ).sort((a, b) => b[1] - a[1])[0][0];

  // Select diversity slot: highest-scored slot NOT in majority bucket
  const diversitySlot = scoredSlots.find((s) => s.bucket !== majorityBucket);

  // Select remaining slots by score
  const selected: ScoredSlot[] = [];

  if (diversitySlot) {
    selected.push(diversitySlot);
  }

  // Fill remaining slots with highest scores (excluding diversity slot if selected)
  for (const s of scoredSlots) {
    if (selected.length >= maxSlots) break;
    if (diversitySlot && s.slot.start_at === diversitySlot.slot.start_at)
      continue;
    selected.push(s);
  }

  // Sort selected slots chronologically for display
  return selected
    .map((s) => s.slot)
    .sort(
      (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
    );
}

// Export for testing
export { detectGaps, scoreSlotByProximity, getTimeBucket };
export type { Gap, ScoredSlot, TimeBucket };
