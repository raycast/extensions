# Smart Slot Selection Design

## Problem

Currently, the extension shows the first 4 available slots per day, sorted chronologically. This creates two issues:

1. **No time diversity** — All suggested slots may cluster in the morning, leaving the recipient without options if mornings don't work
2. **No meeting batching** — Slots are suggested randomly rather than adjacent to existing meetings, leading to fragmented calendars

## Goals

1. **Batching priority**: Suggest times adjacent to existing meetings (inferred from gaps in availability)
2. **Diversity fallback**: Ensure at least one slot from a different time bucket as a fallback option
3. **Respect user's batching preference**: Keep meetings clustered rather than scattered

## Design

### Time Buckets

| Bucket | Hours |
|--------|-------|
| Morning | 6am – 12pm |
| Afternoon | 12pm – 5pm |
| Evening | 5pm – 9pm |

### Gap Detection

Meetings are inferred by finding discontinuities in available slots:

```text
Slots: 9:00, 9:30, 10:00, [GAP], 14:00, 14:30, 15:00
                         ↑
                  Meeting block (10:00-14:00)
```

**Algorithm:**
1. Sort all slots chronologically
2. Calculate time between consecutive slots
3. If gap > expected increment (default: 30 min), mark as a "meeting block"

### Slot Scoring

Each slot is scored by proximity to the nearest gap edge:

- Immediately before/after gap = highest score (1.0)
- Score decreases with distance from gap
- Formula: `score = 1 / (1 + minutesFromGap / 30)`

### Selection Algorithm

```text
function selectSmartSlots(daySlots, maxSlots = 4):
  1. Detect gaps in daySlots
  2. Score each slot by proximity to nearest gap
  3. Group slots by time bucket (morning/afternoon/evening)
  4. Find the "majority bucket" (most slots or highest-scored slots)
  5. Reserve 1 slot for diversity:
     - Pick from a non-majority bucket
     - Within that bucket, pick the highest-scored slot (closest to gap)
  6. Fill remaining (maxSlots - 1) slots:
     - Pick highest-scored slots regardless of bucket
  7. Return all selected slots, sorted chronologically
```

### Edge Cases

| Scenario | Behavior |
|----------|----------|
| No gaps (free day) | Fall back to even distribution across buckets |
| All gaps (1-2 isolated slots) | Show what's available |
| Only one bucket has slots | Skip diversity requirement, show top 4 |
| Multiple meeting blocks | Score by proximity to nearest gap |

### Example

**Input:**
- Available slots: 9:00, 9:30, 10:00, 14:00, 14:30, 15:00, 15:30, 16:00
- Detected gap: 10:00 → 14:00 (meeting block)

**Scoring:**
- 10:00 → score 1.0 (at gap edge)
- 14:00 → score 1.0 (at gap edge)
- 9:30 → score 0.5 (30 min from gap)
- 14:30 → score 0.5 (30 min from gap)
- 9:00 → score 0.33 (60 min from gap)
- 15:00 → score 0.33 (60 min from gap)

**Selection:**
1. Majority bucket: Afternoon (5 slots vs 3 morning)
2. Diversity slot: 10:00 (morning, highest score in bucket)
3. Fill remaining 3: 14:00, 9:30, 14:30 (highest scores)
4. Final output (chronological): **9:30, 10:00, 14:00, 14:30**

## Implementation

### New File: `src/slotSelection.ts`

```typescript
interface ScoredSlot {
  slot: TimeSlot;
  score: number;
  bucket: 'morning' | 'afternoon' | 'evening';
}

export function selectSmartSlots(
  slots: TimeSlot[],
  timezone: string,
  maxSlots?: number
): TimeSlot[];

// Internal helpers
function detectGaps(slots: TimeSlot[]): Gap[];
function scoreSlotByProximity(slot: TimeSlot, gaps: Gap[]): number;
function getTimeBucket(slot: TimeSlot, timezone: string): 'morning' | 'afternoon' | 'evening';
```

### Integration Point

In `propose-times.tsx`, replace:

```typescript
// Before (lines 117-120)
const sortedSlots = [...daySlots].sort(...);
const displaySlots = sortedSlots.slice(0, 4);

// After
const displaySlots = selectSmartSlots(daySlots, timezone, 4);
```

### Testing

New test file: `src/__tests__/slotSelection.test.ts`

Test cases:
- Gap detection with various meeting patterns
- Scoring accuracy
- Diversity slot selection
- Edge cases (no gaps, all gaps, single bucket)

## Not Included (Future Consideration)

- **Cal.com busy-times API integration**: Could provide more accurate meeting detection, but requires additional credential management
- **Configurable preferences**: Let users adjust batching vs. spread priority in Raycast preferences
- **SavvyCal preference sync**: Not available via API currently
