import { describe, expect, it } from "vitest";
import { rangeOf } from "@/common/utils/collection-utils";
import { buildWeekTimeline, clipTimelineToRange } from "@/domain/week-timeline";
import { OnCallEvent } from "@/domain/on-call-event";

const user = { firstName: "Ada", email: "ada@email.com" };
const weekDays = rangeOf(7).map((dayOffset) => new Date(2026, 2, 2 + dayOffset));

describe("buildWeekTimeline", () => {
  it("positions a mid-week event by day index and fraction of day", () => {
    const events = [event({ startedAt: new Date(2026, 2, 4, 6), endedAt: new Date(2026, 2, 5, 18) })];

    expect(buildWeekTimeline(weekDays, events)).toEqual([
      { startDayIndex: 2, startFraction: 0.25, endDayIndex: 3, endFraction: 0.75, user },
    ]);
  });

  it("spans the full week across day indices 0..6", () => {
    const events = [event({ startedAt: new Date(2026, 2, 2, 0), endedAt: new Date(2026, 2, 8, 12) })];

    expect(buildWeekTimeline(weekDays, events)).toEqual([
      { startDayIndex: 0, startFraction: 0, endDayIndex: 6, endFraction: 0.5, user },
    ]);
  });

  it("drops events that fall entirely outside the week", () => {
    const events = [event({ startedAt: new Date(2026, 2, 20, 0), endedAt: new Date(2026, 2, 21, 0) })];

    expect(buildWeekTimeline(weekDays, events)).toEqual([]);
  });
});

describe("clipTimelineToRange", () => {
  it("clamps a span that starts before the range", () => {
    const span = { startDayIndex: 0, startFraction: 0.5, endDayIndex: 6, endFraction: 0.5, user }
    const expectedSpan = { startDayIndex: 5, startFraction: 0, endDayIndex: 6, endFraction: 0.5, user };

    expect(clipTimelineToRange([span], { firstDay: 5, lastDay: 6 })).toEqual([expectedSpan]);
  });

  it("clamps a span that ends after the range", () => {
    const span = { startDayIndex: 0, startFraction: 0.5, endDayIndex: 6, endFraction: 0.5, user }
    const expectedSpan = { startDayIndex: 0, startFraction: 0.5, endDayIndex: 2, endFraction: 1, user };

    expect(clipTimelineToRange([span], { firstDay: 0, lastDay: 2 })).toEqual([expectedSpan]);
  });

  it("drops a span that lies entirely outside the range", () => {
    const span = { startDayIndex: 0, startFraction: 0, endDayIndex: 1, endFraction: 0.5, user }

    expect(clipTimelineToRange([span], { firstDay: 5, lastDay: 6 })).toEqual([]);
  });

  it("leaves a span fully inside the range untouched", () => {
    const span = { startDayIndex: 2, startFraction: 0.25, endDayIndex: 3, endFraction: 0.75, user }
    const expectedSpan = { startDayIndex: 2, startFraction: 0.25, endDayIndex: 3, endFraction: 0.75, user };

    expect(clipTimelineToRange([span], { firstDay: 0, lastDay: 6 })).toEqual([expectedSpan]);
  });
});

function event({ startedAt, endedAt }: { startedAt: Date, endedAt: Date }): OnCallEvent {
  return { user, startedAt: startedAt.toISOString(), endedAt: endedAt.toISOString(), override: false };
}
