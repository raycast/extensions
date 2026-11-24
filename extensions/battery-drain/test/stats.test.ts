import { describe, expect, it } from "vitest";
import { nextPollDelay, timeWeightedAverage } from "../src/analysis/stats";

describe("timeWeightedAverage", () => {
  it("weights each reading by how long it lasted", () => {
    // 10 W for 9 minutes, then 40 W for 1 minute (the last point uses the median step, 1 min)
    const points = [
      { t: 0, w: 10 },
      { t: 9 * 60_000, w: 40 },
    ];
    expect(timeWeightedAverage(points)).toBeCloseTo((10 * 9 + 40 * 9) / 18);
    const uneven = [
      { t: 0, w: 10 },
      { t: 9 * 60_000, w: 10 },
      { t: 10 * 60_000, w: 40 },
    ];
    // steps 9 min and 1 min → median 5 min for the last point
    expect(timeWeightedAverage(uneven)).toBeCloseTo((10 * 9 + 10 * 1 + 40 * 5) / 15);
  });

  it("does not let a reading from before sleep dominate", () => {
    const MIN = 60_000;
    // 30 W, then a 60-minute lid close, then ten minutes of 8 W readings
    const points = [{ t: 0, w: 30 }, ...Array.from({ length: 11 }, (_, i) => ({ t: (60 + i) * MIN, w: 8 }))];
    expect(timeWeightedAverage(points)).toBeLessThan(11);
  });

  it("returns a single reading as is and undefined without data", () => {
    expect(timeWeightedAverage([{ t: 0, w: 7 }])).toBe(7);
    expect(timeWeightedAverage([])).toBeUndefined();
  });
});

describe("nextPollDelay", () => {
  it("keeps a steady cadence by subtracting the time a collection took", () => {
    expect(nextPollDelay(1300, 2000)).toBe(700);
    expect(nextPollDelay(2600, 2000)).toBe(0);
  });
});
