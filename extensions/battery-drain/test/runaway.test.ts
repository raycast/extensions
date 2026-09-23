import { describe, expect, it } from "vitest";
import { level } from "../src/analysis/level";
import { detectRunaways } from "../src/analysis/runaway";
import { THRESHOLDS } from "../src/analysis/thresholds";
import { ProcessInfo, Sample, Snapshot } from "../src/types";

const MIN = 60_000;

function snap(
  t: number,
  procs: { pid: number; command: string; cpu: number; energy?: number }[],
  info: [number, ProcessInfo][] = [],
  systemW = 10,
): Snapshot {
  return {
    t,
    battery: { systemLoadW: systemW },
    processes: procs.map((p) => ({ energy: p.cpu, ...p })),
    processInfo: new Map(info),
    blockers: [],
    errors: [],
  };
}

const hot = (t: number, pid = 42, cmd = "yes", cpu = 99): Sample => ({
  t,
  systemW: 10,
  procs: [{ pid, cmd, cpu, energy: cpu }],
});
const young: [number, ProcessInfo][] = [[42, { etimeSec: 60, cpuTimeSec: 59, user: "me" }]];

describe("detectRunaways", () => {
  it("flags the real zsh case from its CPU-time ratio, without history", () => {
    const s = snap(
      0,
      [{ pid: 10449, command: "zsh", cpu: 99.1 }],
      [[10449, { etimeSec: 79942, cpuTimeSec: 79262.22, user: "johndoe" }]],
    );
    expect(detectRunaways([], s)).toEqual([{ pid: 10449, command: "zsh", cpu: 99.1, sinceSec: 79942 }]);
  });

  it("flags a streak of at least 15 minutes from history", () => {
    const history = [0, 5, 10, 15].map((m) => hot(m * MIN));
    const s = snap(16 * MIN, [{ pid: 42, command: "yes", cpu: 99 }], young);
    expect(detectRunaways(history, s)).toEqual([{ pid: 42, command: "yes", cpu: 99, sinceSec: 16 * 60 }]);
  });

  it("does not flag a streak shorter than 15 minutes", () => {
    const history = [5, 10].map((m) => hot(m * MIN));
    expect(detectRunaways(history, snap(12 * MIN, [{ pid: 42, command: "yes", cpu: 99 }], young))).toEqual([]);
  });

  it("breaks the streak at a sleep gap longer than ten minutes", () => {
    const history = [hot(0), hot(5 * MIN), hot(30 * MIN)];
    expect(detectRunaways(history, snap(35 * MIN, [{ pid: 42, command: "yes", cpu: 99 }], young))).toEqual([]);
  });

  it("breaks the streak when a sample dips below the threshold", () => {
    const history = [hot(0), hot(5 * MIN, 42, "yes", 20), hot(10 * MIN), hot(15 * MIN)];
    expect(detectRunaways(history, snap(16 * MIN, [{ pid: 42, command: "yes", cpu: 99 }], young))).toEqual([]);
  });

  it("does not let a reused PID inherit another command's streak", () => {
    const history = [0, 5, 10, 15].map((m) => hot(m * MIN, 42, "old-proc"));
    expect(detectRunaways(history, snap(16 * MIN, [{ pid: 42, command: "yes", cpu: 99 }], young))).toEqual([]);
  });

  it("does not let a new process on a reused PID inherit an old process's streak of the same name", () => {
    // An old "yes" ran hot from minute 0 and exited; a new "yes" got pid 42 a minute ago (started at 15 min).
    const history = [0, 5, 10, 15].map((m) => ({ ...hot(m * MIN), procs: [{ ...hot(0).procs[0], start: 0 }] }));
    expect(detectRunaways(history, snap(16 * MIN, [{ pid: 42, command: "yes", cpu: 99 }], young))).toEqual([]);
  });

  it("keeps the streak when the same process's rounded start drifts by a minute between runs", () => {
    // Snapshot time is taken before top and ps, etime after: collection delay can move the rounded start
    // across a minute boundary.
    const history = [0, 5, 10, 15].map((m) => ({ ...hot(m * MIN), procs: [{ ...hot(0).procs[0], start: 14 * MIN }] }));
    const old: [number, ProcessInfo][] = [[42, { etimeSec: 16 * 60, cpuTimeSec: 60, user: "me" }]];
    const now = snap(16 * MIN, [{ pid: 42, command: "yes", cpu: 99 }], old);
    // Started at 0 by etime; the stored samples say 14 min: far apart, so they are different processes.
    expect(detectRunaways(history, now)).toEqual([]);
    const drifted = history.map((h) => ({ ...h, procs: [{ ...h.procs[0], start: -1 * MIN }] }));
    expect(detectRunaways(drifted, now)).toHaveLength(1);
  });

  it("skips samples whose process list was not measured instead of ending the streak there", () => {
    // top failed on one menu bar run: its sample has watts but no processes.
    const history = [0, 5, 10, 15].map((m) =>
      m === 10 ? { t: m * MIN, procs: [], procsMissing: true as const } : hot(m * MIN),
    );
    expect(detectRunaways(history, snap(16 * MIN, [{ pid: 42, command: "yes", cpu: 99 }], young))).toHaveLength(1);
  });

  it("keeps the streak of a long-named process while ps is down and top's name is truncated", () => {
    const history = [0, 5, 10, 15].map((m) => hot(m * MIN, 42, m === 10 ? "Example Sync Ser" : "Example Sync Service"));
    const now = snap(16 * MIN, [{ pid: 42, command: "Example Sync Service", cpu: 99 }], young);
    expect(detectRunaways(history, now)).toHaveLength(1);
  });

  it("matches starts a minute apart either way, but not three minutes apart", () => {
    const at = (start: number) =>
      [0, 5, 10, 15].map((m) => ({ ...hot(m * MIN), procs: [{ ...hot(0).procs[0], start }] }));
    const now = snap(
      16 * MIN,
      [{ pid: 42, command: "yes", cpu: 99 }],
      [[42, { etimeSec: 16 * 60, cpuTimeSec: 60, user: "me" }]],
    );
    expect(detectRunaways(at(MIN), now)).toHaveLength(1);
    expect(detectRunaways(at(2 * MIN), now)).toHaveLength(1);
    expect(detectRunaways(at(3 * MIN), now)).toEqual([]);
  });

  it("still counts samples stored before start times were recorded", () => {
    const history = [0, 5, 10, 15].map((m) => hot(m * MIN));
    expect(detectRunaways(history, snap(16 * MIN, [{ pid: 42, command: "yes", cpu: 99 }], young))).toHaveLength(1);
  });

  it("ignores a process that is idle now even if its lifetime ratio is high", () => {
    const s = snap(0, [{ pid: 7, command: "idle", cpu: 1 }], [[7, { etimeSec: 3600, cpuTimeSec: 3500, user: "me" }]]);
    expect(detectRunaways([], s)).toEqual([]);
  });
});

describe("level", () => {
  it("does not count an unmeasured sample against a sustained energy hog", () => {
    const hog = (t: number): Sample => ({ t, systemW: 10, procs: [{ pid: 7, cmd: "hog", cpu: 60, energy: 60 }] });
    const history = [
      hog(0),
      hog(60_000),
      hog(120_000),
      { t: 180_000, systemW: 10, procs: [], procsMissing: true as const },
    ];
    const s = snap(240_000, [{ pid: 7, command: "hog", cpu: 60, energy: 60 }]);
    expect(level(history, s, [])).toBe("high");
  });

  it("is runaway when any runaway exists", () => {
    expect(level([], snap(0, []), [{ pid: 1, command: "x", cpu: 99, sinceSec: 999 }])).toBe("runaway");
  });

  it("is high when the last three points are all at least 25 W", () => {
    const history: Sample[] = [
      { t: 0, systemW: 30, procs: [] },
      { t: MIN, systemW: 28, procs: [] },
    ];
    expect(level(history, snap(2 * MIN, [], [], 26), [])).toBe("high");
  });

  it("is not high for a single spike", () => {
    const history: Sample[] = [
      { t: 0, systemW: 8, procs: [] },
      { t: MIN, systemW: 9, procs: [] },
    ];
    expect(level(history, snap(2 * MIN, [], [], 40), [])).toBe("normal");
  });

  it("is not high for a single energy spike, such as WindowServer while a menu opens", () => {
    expect(level([], snap(0, [{ pid: 3, command: "WindowServer", cpu: 40, energy: 55 }]), [])).toBe("normal");
  });

  it("is high when the same process stays at energy impact 50 or more for three samples", () => {
    const hog = (t: number): Sample => ({ t, procs: [{ pid: 3, cmd: "chrome", cpu: 40, energy: 60 }] });
    const s = snap(2 * MIN, [{ pid: 3, command: "chrome", cpu: 40, energy: 55 }]);
    expect(level([hog(0), hog(MIN)], s, [])).toBe("high");
  });

  it("is not high when the menu was opened three times within seconds during an energy spike", () => {
    const hog = (t: number): Sample => ({ t, procs: [{ pid: 3, cmd: "WindowServer", cpu: 40, energy: 60 }] });
    const s = snap(20_000, [{ pid: 3, command: "WindowServer", cpu: 40, energy: 60 }]);
    expect(level([hog(0), hog(10_000)], s, [])).toBe("normal");
  });

  it("does not bridge a sleep gap for sustained energy", () => {
    const hog = (t: number): Sample => ({ t, procs: [{ pid: 3, cmd: "chrome", cpu: 40, energy: 60 }] });
    const s = snap(120 * MIN, [{ pid: 3, command: "chrome", cpu: 40, energy: 60 }]);
    expect(level([hog(0), hog(MIN)], s, [])).toBe("normal");
  });

  it("counts one 60-second telemetry reading once, however often the menu opened", () => {
    const repeat = (t: number): Sample => ({ t, wAt: 5000, systemW: 30, procs: [] });
    const s = snap(40_000, [], [], 30);
    s.battery.updatedAt = 5000;
    expect(level([repeat(10_000), repeat(25_000)], s, [])).toBe("normal");
  });

  it("does not call readings on both sides of a sleep gap sustained", () => {
    const history: Sample[] = [
      { t: 0, wAt: 0, systemW: 30, procs: [] },
      { t: MIN, wAt: MIN, systemW: 30, procs: [] },
    ];
    const s = snap(61 * MIN, [], [], 30);
    s.battery.updatedAt = 61 * MIN;
    expect(level(history, s, [])).toBe("normal");
  });

  it("uses the high-watts preference", () => {
    const history: Sample[] = [
      { t: 0, systemW: 15, procs: [] },
      { t: MIN, systemW: 16, procs: [] },
    ];
    const s = snap(2 * MIN, [], [], 17);
    expect(level(history, s, [])).toBe("normal");
    expect(level(history, s, [], { ...THRESHOLDS, highWatts: 12 })).toBe("high");
  });

  it("is normal otherwise", () => {
    expect(level([], snap(0, [{ pid: 3, command: "a", cpu: 5 }]), [])).toBe("normal");
  });
});
