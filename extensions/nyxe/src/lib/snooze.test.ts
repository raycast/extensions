import { describe, expect, it } from "vitest";
import { snoozePresets } from "./snooze";

// Dates are built with the local-time constructor, so these hold in any
// time zone the tests run in.
const at = (y: number, m: number, d: number, h: number, min = 0) => new Date(y, m - 1, d, h, min);

describe("snoozePresets", () => {
  it("offers later today, tomorrow and next Monday on a Wednesday morning", () => {
    const now = at(2026, 9, 23, 9, 15); // Wed
    expect(snoozePresets(now)).toEqual([
      { id: "later-today", title: "Later Today", wakeAt: at(2026, 9, 23, 13).getTime() },
      { id: "tomorrow", title: "Tomorrow 8:00", wakeAt: at(2026, 9, 24, 8).getTime() },
      { id: "next-week", title: "Next Week (Mon 8:00)", wakeAt: at(2026, 9, 28, 8).getTime() },
    ]);
  });

  it("keeps an exact hour when three hours out lands on one", () => {
    const [later] = snoozePresets(at(2026, 9, 23, 10, 0));
    expect(later).toMatchObject({ id: "later-today", wakeAt: at(2026, 9, 23, 13).getTime() });
  });

  it("drops later today in the evening", () => {
    const ids = snoozePresets(at(2026, 9, 23, 19, 30)).map((p) => p.id);
    expect(ids).toEqual(["tomorrow", "next-week"]);
  });

  it("means the NEXT Monday on a Monday, and crosses months", () => {
    const presets = snoozePresets(at(2026, 9, 28, 7)); // Mon
    expect(presets.find((p) => p.id === "next-week")!.wakeAt).toBe(at(2026, 10, 5, 8).getTime());
    expect(presets.find((p) => p.id === "tomorrow")!.wakeAt).toBe(at(2026, 9, 29, 8).getTime());
  });

  it("means tomorrow on a Sunday", () => {
    const presets = snoozePresets(at(2026, 9, 27, 22)); // Sun
    expect(presets.find((p) => p.id === "next-week")!.wakeAt).toBe(at(2026, 9, 28, 8).getTime());
  });

  it("always wakes in the future", () => {
    for (let h = 0; h < 24; h++) {
      const now = at(2026, 12, 31, h, 45);
      for (const p of snoozePresets(now)) expect(p.wakeAt).toBeGreaterThan(now.getTime());
    }
  });
});
