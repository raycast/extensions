import { describe, expect, it } from "vitest";
import { drainRate, topConsumers } from "../src/analysis/drain";

describe("topConsumers", () => {
  const at = (min: number, procs: [string, number][]): Sample => ({
    t: min * 60_000,
    procs: procs.map(([cmd, energy], i) => ({ pid: i + 1, cmd, cpu: energy, energy })),
  });

  it("ranks processes by energy summed over the window", () => {
    const history = [
      at(0, [
        ["WindowServer", 40],
        ["MSTeams", 30],
      ]),
      at(1, [
        ["MSTeams", 35],
        ["WindowServer", 20],
      ]),
      at(2, [["Code", 5]]),
    ];
    expect(topConsumers(history, 2 * 60_000, 30 * 60_000, 2)).toEqual(["MSTeams", "WindowServer"]);
  });

  it("ignores samples outside the window", () => {
    const history = [at(0, [["old", 99]]), at(50, [["new", 1]])];
    expect(topConsumers(history, 50 * 60_000, 30 * 60_000, 2)).toEqual(["new"]);
  });

  it("is empty without history", () => {
    expect(topConsumers([], 0, 30 * 60_000, 2)).toEqual([]);
  });
});
import { Sample } from "../src/types";

const MIN = 60_000;
const s = (min: number, percent: number, onAC = false): Sample => ({ t: min * MIN, percent, onAC, procs: [] });

describe("drainRate", () => {
  it("measures percent per hour across consecutive battery samples", () => {
    expect(drainRate([s(0, 80), s(5, 78), s(10, 76), s(15, 74)])).toBeCloseTo(24);
  });

  it("skips gaps longer than ten minutes (sleep)", () => {
    // 0→5 and 65→70 count (10 min, 2%); 5→65 is a sleep gap
    expect(drainRate([s(0, 80), s(5, 79), s(65, 75), s(70, 74)])).toBeCloseTo(12);
  });

  it("ignores AC segments", () => {
    expect(drainRate([s(0, 50, true), s(5, 55, true), s(10, 55), s(15, 54), s(20, 53)])).toBeCloseTo(12);
  });

  it("needs at least ten minutes of battery samples", () => {
    expect(drainRate([s(0, 80), s(5, 79)])).toBeUndefined();
    expect(drainRate([])).toBeUndefined();
  });
});
