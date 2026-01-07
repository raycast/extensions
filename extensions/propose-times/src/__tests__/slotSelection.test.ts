import { describe, it, expect } from "vitest";
import {
  selectSmartSlots,
  detectGaps,
  scoreSlotByProximity,
  getTimeBucket,
} from "../slotSelection";
import type { TimeSlot } from "../types";

// Helper to create slots at specific times on a given day
function slot(time: string, date: string = "2026-01-07"): TimeSlot {
  return {
    start_at: `${date}T${time}:00Z`,
    end_at: `${date}T${time.replace(/(\d+):/, (_, h) => `${parseInt(h) + 1}:`)}:00Z`,
  };
}

describe("getTimeBucket", () => {
  it("classifies morning slots (before 12pm)", () => {
    expect(getTimeBucket(slot("09:00"), "UTC")).toBe("morning");
    expect(getTimeBucket(slot("11:30"), "UTC")).toBe("morning");
  });

  it("classifies afternoon slots (12pm-5pm)", () => {
    expect(getTimeBucket(slot("12:00"), "UTC")).toBe("afternoon");
    expect(getTimeBucket(slot("14:30"), "UTC")).toBe("afternoon");
    expect(getTimeBucket(slot("16:30"), "UTC")).toBe("afternoon");
  });

  it("classifies evening slots (after 5pm)", () => {
    expect(getTimeBucket(slot("17:00"), "UTC")).toBe("evening");
    expect(getTimeBucket(slot("19:30"), "UTC")).toBe("evening");
  });

  it("respects timezone when classifying", () => {
    // 17:00 UTC = 12:00 ET (afternoon in ET)
    expect(getTimeBucket(slot("17:00"), "America/New_York")).toBe("afternoon");
    // 22:00 UTC = 17:00 ET (evening in ET)
    expect(getTimeBucket(slot("22:00"), "America/New_York")).toBe("evening");
  });
});

describe("detectGaps", () => {
  it("detects a single gap between slots", () => {
    const slots = [
      slot("09:00"),
      slot("09:30"),
      slot("10:00"),
      // Gap: 10:00 -> 14:00 (meeting)
      slot("14:00"),
      slot("14:30"),
    ];

    const gaps = detectGaps(slots);

    expect(gaps).toHaveLength(1);
    expect(gaps[0].start.toISOString()).toContain("10:00");
    expect(gaps[0].end.toISOString()).toContain("14:00");
  });

  it("detects multiple gaps", () => {
    const slots = [
      slot("09:00"),
      slot("09:30"),
      // Gap 1: 09:30 -> 11:00
      slot("11:00"),
      slot("11:30"),
      // Gap 2: 11:30 -> 14:00
      slot("14:00"),
    ];

    const gaps = detectGaps(slots);

    expect(gaps).toHaveLength(2);
  });

  it("returns empty array when no gaps", () => {
    const slots = [slot("09:00"), slot("09:30"), slot("10:00"), slot("10:30")];

    const gaps = detectGaps(slots);

    expect(gaps).toHaveLength(0);
  });

  it("returns empty array for single slot", () => {
    const gaps = detectGaps([slot("09:00")]);
    expect(gaps).toHaveLength(0);
  });

  it("returns empty array for empty input", () => {
    const gaps = detectGaps([]);
    expect(gaps).toHaveLength(0);
  });

  it("handles unsorted slots", () => {
    const slots = [slot("14:00"), slot("09:00"), slot("10:00"), slot("09:30")];

    const gaps = detectGaps(slots);

    expect(gaps).toHaveLength(1);
    expect(gaps[0].start.toISOString()).toContain("10:00");
    expect(gaps[0].end.toISOString()).toContain("14:00");
  });
});

describe("scoreSlotByProximity", () => {
  it("scores slots at gap edges highest", () => {
    const gaps = [
      {
        start: new Date("2026-01-07T10:00:00Z"),
        end: new Date("2026-01-07T14:00:00Z"),
      },
    ];

    // Slot right at gap edge
    const edgeScore = scoreSlotByProximity(slot("10:00"), gaps);
    // Slot 30 min away
    const nearScore = scoreSlotByProximity(slot("09:30"), gaps);
    // Slot 60 min away
    const farScore = scoreSlotByProximity(slot("09:00"), gaps);

    expect(edgeScore).toBe(1);
    expect(nearScore).toBeCloseTo(0.5, 1);
    expect(farScore).toBeCloseTo(0.33, 1);
  });

  it("scores slots after gap end correctly", () => {
    const gaps = [
      {
        start: new Date("2026-01-07T10:00:00Z"),
        end: new Date("2026-01-07T14:00:00Z"),
      },
    ];

    const atEnd = scoreSlotByProximity(slot("14:00"), gaps);
    const afterEnd = scoreSlotByProximity(slot("14:30"), gaps);

    expect(atEnd).toBe(1);
    expect(afterEnd).toBeCloseTo(0.5, 1);
  });

  it("returns 0.5 when no gaps exist", () => {
    const score = scoreSlotByProximity(slot("10:00"), []);
    expect(score).toBe(0.5);
  });

  it("uses nearest gap when multiple gaps exist", () => {
    const gaps = [
      {
        start: new Date("2026-01-07T10:00:00Z"),
        end: new Date("2026-01-07T11:00:00Z"),
      },
      {
        start: new Date("2026-01-07T14:00:00Z"),
        end: new Date("2026-01-07T15:00:00Z"),
      },
    ];

    // 13:30 is 30 min from gap2 start, but 2.5 hours from gap1 end
    const score = scoreSlotByProximity(slot("13:30"), gaps);
    expect(score).toBeCloseTo(0.5, 1); // 30 min away from nearest gap
  });
});

describe("selectSmartSlots", () => {
  it("returns all slots when fewer than maxSlots available", () => {
    const slots = [slot("09:00"), slot("10:00")];
    const result = selectSmartSlots(slots, "UTC", 4);

    expect(result).toHaveLength(2);
  });

  it("prioritizes slots adjacent to gaps", () => {
    const slots = [
      slot("09:00"),
      slot("09:30"),
      slot("10:00"),
      // Gap (meeting 10:30-13:30)
      slot("14:00"),
      slot("14:30"),
      slot("15:00"),
      slot("15:30"),
      slot("16:00"),
    ];

    const result = selectSmartSlots(slots, "UTC", 4);

    // Should include 10:00 (before gap) and 14:00 (after gap)
    const times = result.map((s) => s.start_at.slice(11, 16));
    expect(times).toContain("10:00");
    expect(times).toContain("14:00");
  });

  it("includes diversity slot from different bucket", () => {
    const slots = [
      slot("09:00"),
      slot("09:30"),
      slot("10:00"),
      // Gap (meeting)
      slot("14:00"),
      slot("14:30"),
      slot("15:00"),
      slot("15:30"),
      slot("16:00"),
    ];

    const result = selectSmartSlots(slots, "UTC", 4);

    // Should have at least one morning slot even though afternoon has more
    const buckets = result.map((s) => {
      const hour = parseInt(s.start_at.slice(11, 13));
      return hour < 12 ? "morning" : "afternoon";
    });

    expect(buckets).toContain("morning");
    expect(buckets).toContain("afternoon");
  });

  it("returns slots sorted chronologically", () => {
    const slots = [
      slot("16:00"),
      slot("09:00"),
      slot("14:00"),
      slot("10:00"),
      slot("15:00"),
    ];

    const result = selectSmartSlots(slots, "UTC", 4);

    for (let i = 1; i < result.length; i++) {
      const prev = new Date(result[i - 1].start_at).getTime();
      const curr = new Date(result[i].start_at).getTime();
      expect(curr).toBeGreaterThan(prev);
    }
  });

  it("handles single bucket availability gracefully", () => {
    // All afternoon slots
    const slots = [
      slot("14:00"),
      slot("14:30"),
      slot("15:00"),
      slot("15:30"),
      slot("16:00"),
    ];

    const result = selectSmartSlots(slots, "UTC", 4);

    // Should still return 4 slots even though all same bucket
    expect(result).toHaveLength(4);
  });

  it("handles completely free day (no gaps)", () => {
    const slots = [
      slot("09:00"),
      slot("09:30"),
      slot("10:00"),
      slot("10:30"),
      slot("11:00"),
      slot("11:30"),
    ];

    const result = selectSmartSlots(slots, "UTC", 4);

    // Should return 4 slots
    expect(result).toHaveLength(4);
  });

  it("respects timezone for bucket classification", () => {
    // These are all afternoon in ET but evening in UTC
    const slots = [
      slot("17:00"), // 12pm ET
      slot("17:30"), // 12:30pm ET
      slot("18:00"), // 1pm ET
      slot("21:00"), // 4pm ET
      slot("21:30"), // 4:30pm ET
      slot("22:00"), // 5pm ET (evening)
    ];

    const result = selectSmartSlots(slots, "America/New_York", 4);

    // Should include evening diversity slot (22:00 UTC = 5pm ET)
    expect(result).toHaveLength(4);
  });

  describe("real-world scenario: morning meetings", () => {
    it("suggests times after morning meeting block", () => {
      // User has meetings 9am-12pm
      const slots = [
        // Morning all blocked except 8:30
        slot("08:30"),
        // Afternoon wide open
        slot("12:00"),
        slot("12:30"),
        slot("13:00"),
        slot("13:30"),
        slot("14:00"),
        slot("14:30"),
        slot("15:00"),
      ];

      const result = selectSmartSlots(slots, "UTC", 4);
      const times = result.map((s) => s.start_at.slice(11, 16));

      // Should include 12:00 (right after meetings) and maybe 08:30 (right before)
      expect(times).toContain("12:00");
      // Should have diversity (morning option)
      expect(times).toContain("08:30");
    });
  });

  describe("BUG: duplicate times", () => {
    it("never returns duplicate times", () => {
      // Scenario that could produce duplicates:
      // - diversity slot and high-score slot are the same time
      const slots = [
        slot("11:00"),
        slot("12:00"),
        slot("12:30"),
        slot("13:00"),
      ];

      const result = selectSmartSlots(slots, "UTC", 3);
      const times = result.map((s) => s.start_at);

      // All times should be unique
      const uniqueTimes = new Set(times);
      expect(uniqueTimes.size).toBe(result.length);
    });

    it("never returns duplicate times even with identical scores", () => {
      // All slots have equal scores (no gaps = all 0.5)
      const slots = [
        slot("09:00"),
        slot("09:30"),
        slot("10:00"),
        slot("10:30"),
        slot("14:00"),
        slot("14:30"),
      ];

      const result = selectSmartSlots(slots, "UTC", 3);
      const times = result.map((s) => s.start_at);

      const uniqueTimes = new Set(times);
      expect(uniqueTimes.size).toBe(result.length);
    });

    it("handles input with duplicate slots from API", () => {
      // API might return the same slot multiple times
      const slots = [
        slot("11:00"),
        slot("12:00"),
        slot("12:00"), // Duplicate from API!
        slot("12:30"),
        slot("13:00"),
      ];

      const result = selectSmartSlots(slots, "UTC", 3);
      const times = result.map((s) => s.start_at);

      // All returned times should be unique
      const uniqueTimes = new Set(times);
      expect(uniqueTimes.size).toBe(result.length);
    });

    it("deduplicates slots with same start time but different end time", () => {
      // Could happen with duration variants
      const slots: TimeSlot[] = [
        { start_at: "2026-01-07T11:00:00Z", end_at: "2026-01-07T11:25:00Z" },
        { start_at: "2026-01-07T12:00:00Z", end_at: "2026-01-07T12:25:00Z" },
        { start_at: "2026-01-07T12:00:00Z", end_at: "2026-01-07T12:30:00Z" }, // Same start, different duration
        { start_at: "2026-01-07T12:30:00Z", end_at: "2026-01-07T12:55:00Z" },
        { start_at: "2026-01-07T13:00:00Z", end_at: "2026-01-07T13:25:00Z" },
      ];

      const result = selectSmartSlots(slots, "UTC", 3);
      const startTimes = result.map((s) => s.start_at);

      // All start times should be unique
      const uniqueStartTimes = new Set(startTimes);
      expect(uniqueStartTimes.size).toBe(result.length);
    });
  });
});
