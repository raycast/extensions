import { describe, expect, it } from "vitest";
import { DAY_NAMES, PLATFORMS, platformById } from "./heatmaps";

describe("shipped PLATFORMS", () => {
  it("ships exactly 8 platforms", () => {
    expect(PLATFORMS.length).toBe(8);
  });

  it("every platform has a unique id", () => {
    const ids = PLATFORMS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every platform's heatmap is 7 days × 24 hours", () => {
    for (const p of PLATFORMS) {
      expect(p.heatmap.length).toBe(7);
      for (const row of p.heatmap) {
        expect(row.length).toBe(24);
      }
    }
  });

  it("hours 0–5 and 23 are zero across every platform (Buffer shows 6–22)", () => {
    for (const p of PLATFORMS) {
      for (const row of p.heatmap) {
        for (const h of [0, 1, 2, 3, 4, 5, 23]) {
          expect(row[h]).toBe(0);
        }
      }
    }
  });

  it("every platform has at least one best (intensity 3) cell", () => {
    for (const p of PLATFORMS) {
      const hasBest = p.heatmap.some((row) => row.some((v) => v === 3));
      expect(hasBest, `${p.name} has no best cell`).toBe(true);
    }
  });

  it("intensity values are always 0–3", () => {
    for (const p of PLATFORMS) {
      for (const row of p.heatmap) {
        for (const v of row) {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(3);
        }
      }
    }
  });
});

describe("platformById", () => {
  it("returns the platform when the id is known", () => {
    expect(platformById("linkedin")?.name).toBe("LinkedIn");
  });
  it("returns undefined for unknown ids", () => {
    expect(platformById("foobar")).toBeUndefined();
  });
});

describe("DAY_NAMES", () => {
  it("is exactly Mon..Sun in order", () => {
    expect([...DAY_NAMES]).toEqual([
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
      "Sun",
    ]);
  });
});
