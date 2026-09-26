import { describe, expect, it } from "vitest";
import {
  appendReading,
  batterySummary,
  chartFrame,
  nowDetail,
  processCpuSeries,
  sourceWarning,
} from "../src/render/summary";

describe("chartFrame", () => {
  const points = [
    { t: 1000, w: 5 },
    { t: 6000, w: 9 },
    { t: 11000, w: 7 },
  ];

  it("draws the chart as of the last full poll, so its image changes every 15 s rather than every 5 s", () => {
    // Raycast 1.x blanks a markdown image while it reloads, so every redraw blinks.
    expect(chartFrame(points, 6000)).toEqual(points.slice(0, 2));
  });

  it("draws every point before the first full poll", () => {
    expect(chartFrame(points, undefined)).toEqual(points);
  });
});

describe("nowDetail", () => {
  it("lists the power readings and battery health, but not Now or the charge, which the row itself shows", () => {
    const b = {
      percent: 80,
      externalConnected: true,
      isCharging: false,
      notChargingReason: 4,
      nominalChargeCapacity: 8657,
      designCapacity: 8579,
      cycleCount: 35,
    };
    expect(nowDetail({ average: 11.7, peak: 48.3, adapter: 13.9 }, b)).toEqual({
      power: [
        { title: "Average", text: "11.7 W" },
        { title: "Peak", text: "48.3 W" },
        { title: "Adapter Input", text: "13.9 W" },
      ],
      battery: [{ title: "Health", text: "100% · 35 cycles" }],
    });
  });

  it("on battery shows the drain, and cycles alone when health is unknown", () => {
    const d = nowDetail({ average: 10, peak: 20, drain: "12% per hour" }, { percent: 42, cycleCount: 35 });
    expect(d.power[2]).toEqual({ title: "Battery Drain", text: "12% per hour" });
    expect(d.battery).toEqual([{ title: "Health", text: "35 cycles" }]);
  });

  it("has no battery lines on a Mac without a battery", () => {
    expect(nowDetail({ average: 21 }, {}).battery).toEqual([]);
  });
});

describe("processCpuSeries", () => {
  it("takes the process's CPU from each sample, matched on pid and command, then now", () => {
    const history: Sample[] = [
      { t: 0, procs: [{ pid: 42, cmd: "yes", cpu: 20, energy: 20 }] },
      { t: 60_000, procs: [{ pid: 42, cmd: "other", cpu: 5, energy: 5 }] }, // reused pid
      { t: 120_000, procs: [{ pid: 42, cmd: "yes", cpu: 99, energy: 99 }] },
    ];
    expect(processCpuSeries(history, { pid: 42, command: "yes", cpu: 98 }, 180_000)).toEqual([
      { t: 0, w: 20 },
      { t: 60_000, w: 0 }, // the pid belonged to another process then
      { t: 120_000, w: 99 },
      { t: 180_000, w: 98 },
    ]);
  });

  it("reads 0 where a sample lacks the process, since a sample keeps only the top 10 by energy", () => {
    // Seen on 2026-09-23: Raycast used 0.3% CPU, fell out of the top 10 for 30 minutes, then read
    // 4.2% once; the chart bridged the "gap" with a dashed line as if nothing had been measured.
    const history: Sample[] = [
      { t: 0, procs: [{ pid: 910, cmd: "Raycast", cpu: 0.3, energy: 0.3 }] },
      { t: 60_000, procs: [{ pid: 9, cmd: "WindowServer", cpu: 24, energy: 24 }] },
      { t: 120_000, procs: [{ pid: 910, cmd: "Raycast", cpu: 4.2, energy: 4.2 }] },
    ];
    expect(processCpuSeries(history, { pid: 910, command: "Raycast", cpu: 0.5 }, 180_000).map((p) => p.w)).toEqual([
      0.3, 0, 4.2, 0.5,
    ]);
  });

  it("leaves out samples whose processes were not measured, rather than drawing a drop to 0", () => {
    const history: Sample[] = [
      { t: 0, procs: [{ pid: 42, cmd: "yes", cpu: 90, energy: 90 }] },
      { t: 60_000, procs: [], procsMissing: true },
    ];
    expect(processCpuSeries(history, { pid: 42, command: "yes", cpu: 95 }, 120_000).map((p) => p.t)).toEqual([
      0, 120_000,
    ]);
  });

  it("reads 0 for an older process that had the same pid and name", () => {
    const history: Sample[] = [{ t: 0, procs: [{ pid: 42, cmd: "yes", cpu: 90, energy: 90, start: -60 * 60_000 }] }];
    const series = processCpuSeries(history, { pid: 42, command: "yes", cpu: 95 }, 120_000, 60_000);
    expect(series[0].w).toBe(0);
  });
});

describe("sourceWarning", () => {
  it("is undefined when every source worked", () => {
    expect(sourceWarning([])).toBeUndefined();
  });
  it("names the failed sources without the error detail", () => {
    expect(sourceWarning(["top: timeout"])).toBe("1 data source failed: top");
    expect(sourceWarning(["top: timeout", "pmset batt: Command failed"])).toBe(
      "2 data sources failed: top, pmset batt",
    );
  });
  it("counts sources, not error entries", () => {
    expect(sourceWarning(["ps ancestors: x", "ps ancestors: y", "ps ancestors: z"])).toBe(
      "1 data source failed: ps ancestors",
    );
  });
});
import { Sample, Snapshot } from "../src/types";

const MIN = 60_000;

function snap(partial: Partial<Snapshot>): Snapshot {
  return { t: 0, battery: {}, processes: [], processInfo: new Map(), blockers: [], errors: [], ...partial };
}

const draining: Sample[] = [0, 5, 10, 15].map((m, i) => ({ t: m * MIN, percent: 80 - i * 2, onAC: false, procs: [] }));

describe("batterySummary", () => {
  it("keeps a paused charge short for the menu", () => {
    const s = snap({
      battery: { percent: 80, externalConnected: true, isCharging: false, notChargingReason: 4 },
      source: { source: "ac", percent: 80, state: "AC attached" },
    });
    expect(batterySummary(s, [])).toBe("80% · charge paused");
  });

  it("on battery shows time left and the drain rate with its unit", () => {
    const s = snap({ battery: { percent: 42 }, source: { source: "battery", percent: 42, minutesRemaining: 216 } });
    expect(batterySummary(s, draining)).toBe("42% · 3h 36m left · losing 24% per hour");
  });

  it("leaves the drain rate out until it is known", () => {
    const s = snap({ battery: { percent: 44 }, source: { source: "battery", percent: 44, minutesRemaining: 273 } });
    expect(batterySummary(s, [])).toBe("44% · 4h 33m left");
  });

  it("while charging calls the estimate time to full, not time left", () => {
    const s = snap({
      battery: { percent: 26, externalConnected: true, isCharging: true, adapterInputW: 134.3 },
      source: { source: "ac", percent: 26, state: "charging", minutesRemaining: 87 },
    });
    expect(batterySummary(s, [])).toBe("26% · charging · 1h 27m to full");
  });

  it("is undefined without a battery", () => {
    expect(batterySummary(snap({}), [])).toBeUndefined();
  });
});

describe("appendReading", () => {
  it("adds a reading with a new telemetry time", () => {
    expect(appendReading([{ t: 1, w: 5 }], { t: 2, w: 6 }, 10)).toEqual([
      { t: 1, w: 5 },
      { t: 2, w: 6 },
    ]);
  });

  it("ignores a repeated reading, since macOS refreshes telemetry once a minute", () => {
    const prev = [{ t: 1, w: 5 }];
    expect(appendReading(prev, { t: 1, w: 5 }, 10)).toBe(prev);
  });

  it("keeps at most max points", () => {
    expect(
      appendReading(
        [
          { t: 1, w: 1 },
          { t: 2, w: 2 },
        ],
        { t: 3, w: 3 },
        2,
      ),
    ).toEqual([
      { t: 2, w: 2 },
      { t: 3, w: 3 },
    ]);
  });
});
