import { describe, expect, it } from "vitest";
import {
  formatDayGroupDetailMarkdown,
  formatDayGroupShortLabel,
  formatDayGroupSubtitle,
  formatEventDayLabel,
  formatEventMonthLabel,
  formatEventTimeLabel,
  formatEventYearLabel,
  formatMonthGroupSubtitle,
  formatYearGroupDetailMarkdown,
  formatYearGroupSubtitle,
  getEventDayKey,
  getEventMonthKey,
  getEventYearKey,
  groupDayGroupsByMonth,
  groupEventsByDay,
  groupEventsByYear,
} from "../lib/event-day-groups";
import type { TeslaEvent } from "../types";

function buildEvent(folderName: string, id = folderName): TeslaEvent {
  return {
    id,
    eventDir: `/event/${folderName}`,
    sourceRoot: "/root",
    folderName,
    cameras: [],
    totalSegments: 11,
    totalGaps: 0,
  };
}

describe("event-day-groups", () => {
  it("extracts stable day keys from Tesla folder names", () => {
    expect(getEventDayKey("2025-04-14_08-18-05")).toBe("2025-04-14");
    expect(getEventDayKey("2025-04-14_16-53-41")).toBe("2025-04-14");
    expect(getEventDayKey("invalid")).toBeUndefined();
    expect(getEventYearKey("2025-04-14_08-18-05")).toBe("2025");
    expect(getEventMonthKey("2025-04-14_08-18-05")).toBe("2025-04");
  });

  it("formats day, month, and year labels", () => {
    expect(formatEventDayLabel("2025-04-14")).toBe("Apr 14, 2025");
    expect(formatDayGroupShortLabel("2025-04-14")).toBe("Apr 14");
    expect(formatEventMonthLabel("2025-04")).toBe("April 2025");
    expect(formatEventYearLabel("2025")).toBe("2025");
  });

  it("groups events by calendar day and sorts newest days first", () => {
    const groups = groupEventsByDay([
      buildEvent("2025-04-14_08-18-05", "a"),
      buildEvent("2025-04-14_16-53-41", "b"),
      buildEvent("2025-04-15_09-00-00", "c"),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0]?.dayKey).toBe("2025-04-15");
    expect(groups[1]?.dayKey).toBe("2025-04-14");
    expect(groups[1]?.eventCount).toBe(2);
    expect(groups[1]?.totalSegments).toBe(22);
    expect(groups[1]?.events.map((event) => event.id)).toEqual(["b", "a"]);
  });

  it("formats day summaries for grouped list rows", () => {
    const group = groupEventsByDay([buildEvent("2025-04-14_08-18-05"), buildEvent("2025-04-14_16-53-41")])[0]!;

    expect(formatDayGroupSubtitle(group)).toBe("2 events");
    expect(formatDayGroupDetailMarkdown(group)).toContain("Apr 14, 2025");
    expect(formatDayGroupDetailMarkdown(group)).toContain("**Events:** 2");
  });

  it("formats time-only labels for events within a day", () => {
    expect(formatEventTimeLabel("2025-04-14_08-18-05")).not.toBe(formatEventTimeLabel("2025-04-14_16-53-41"));
    expect(formatEventTimeLabel("2025-04-14_08-18-05")).not.toContain("Apr");
    expect(formatEventTimeLabel("2025-04-14_08-18-05")).not.toContain("2025");
  });

  it("groups day groups by month with newest months first", () => {
    const dayGroups = groupEventsByDay([
      buildEvent("2025-04-14_08-18-05", "a"),
      buildEvent("2025-03-10_09-00-00", "b"),
      buildEvent("2025-04-15_09-00-00", "c"),
    ]);
    const months = groupDayGroupsByMonth(dayGroups);

    expect(months).toHaveLength(2);
    expect(months[0]?.monthKey).toBe("2025-04");
    expect(months[0]?.dayCount).toBe(2);
    expect(months[1]?.monthKey).toBe("2025-03");
    expect(formatMonthGroupSubtitle(months[0]!)).toBe("2 days");
  });

  it("groups events by year with nested month and day groups", () => {
    const years = groupEventsByYear([
      buildEvent("2025-12-30_08-18-05", "a"),
      buildEvent("2025-12-29_16-53-41", "b"),
      buildEvent("2025-11-21_09-00-00", "c"),
      buildEvent("2024-12-01_09-00-00", "d"),
    ]);

    expect(years).toHaveLength(2);
    expect(years[0]?.yearKey).toBe("2025");
    expect(years[0]?.monthCount).toBe(2);
    expect(years[0]?.dayCount).toBe(3);
    expect(years[0]?.months[0]?.label).toBe("December 2025");
    expect(years[0]?.months[0]?.days).toHaveLength(2);
    expect(years[1]?.yearKey).toBe("2024");
    expect(formatYearGroupSubtitle(years[0]!)).toBe("3 days");
    expect(formatYearGroupDetailMarkdown(years[0]!)).toContain("**Months:** 2");
  });
});
